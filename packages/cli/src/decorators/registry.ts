import { Container } from 'typedi';
import type { ZodClass } from 'zod-class';
import { Router } from 'express';
import type { Application, Request, Response, RequestHandler } from 'express';
import { rateLimit as expressRateLimit } from 'express-rate-limit';
import { ApplicationError } from 'n8n-workflow';
import type { Class } from 'n8n-core';

import { AuthService } from '@/auth/auth.service';
import config from '@/config';
import { UnauthenticatedError } from '@/errors/response-errors/unauthenticated.error';
import { inProduction, RESPONSE_ERROR_MESSAGES } from '@/constants';
import type { BooleanLicenseFeature } from '@/Interfaces';
import { License } from '@/License';
import type { AuthenticatedRequest } from '@/requests';
import { send } from '@/ResponseHelper'; // TODO: move `ResponseHelper.send` to this file
import { userHasScope } from '@/permissions/checkAccess';

import type {
	AccessScope,
	Controller,
	ControllerMetadata,
	HandlerName,
	RateLimit,
	RouteMetadata,
} from './types';

const createRateLimitMiddleware = (rateLimit: RateLimit): RequestHandler =>
	expressRateLimit({
		windowMs: rateLimit.windowMs,
		limit: rateLimit.limit,
		message: { message: 'Too many requests' },
	});

const createLicenseMiddleware =
	(feature: BooleanLicenseFeature): RequestHandler =>
	(_req, res, next) => {
		const licenseService = Container.get(License);
		if (!licenseService.isFeatureEnabled(feature)) {
			return res
				.status(403)
				.json({ status: 'error', message: 'Plan lacks license for this feature' });
		}

		return next();
	};

const createScopedMiddleware =
	(accessScope: AccessScope): RequestHandler =>
	async (
		req: AuthenticatedRequest<{ credentialId?: string; workflowId?: string; projectId?: string }>,
		res,
		next,
	) => {
		if (!req.user) throw new UnauthenticatedError();

		const { scope, globalOnly } = accessScope;

		if (!(await userHasScope(req.user, [scope], globalOnly, req.params))) {
			return res.status(403).json({
				status: 'error',
				message: RESPONSE_ERROR_MESSAGES.MISSING_SCOPE,
			});
		}

		return next();
	};

const registry = new Map<Class<object>, ControllerMetadata>();

export const getControllerMetadata = (controllerClass: Class<object>) => {
	let metadata = registry.get(controllerClass);
	if (!metadata) {
		metadata = {
			basePath: '/',
			middlewares: [],
			routes: new Map(),
		};
		registry.set(controllerClass, metadata);
	}
	return metadata;
};

export const getRoute = (controllerClass: Class<object>, handlerName: HandlerName) => {
	const metadata = getControllerMetadata(controllerClass);
	let route = metadata.routes.get(handlerName);
	if (!route) {
		// TODO: replace RouteMetadata with a Route class
		route = {} as RouteMetadata;
		metadata.routes.set(handlerName, route);
	}
	return route;
};

export const registerController = (app: Application, controllerClass: Class<object>) => {
	const metadata = getControllerMetadata(controllerClass);
	if (!metadata.basePath)
		throw new ApplicationError('Controller is missing the RestController decorator', {
			extra: { controllerName: controllerClass.name },
		});

	if (metadata.routes?.size) {
		const controller = Container.get(controllerClass as Class<Controller>);
		const router = Router({ mergeParams: true });
		const restBasePath = config.getEnv('endpoints.rest');
		const prefix = `/${[restBasePath, metadata.basePath].join('/')}`
			.replace(/\/+/g, '/')
			.replace(/\/$/, '');

		const controllerMiddlewares = metadata.middlewares.map(
			(handlerName) => controller[handlerName].bind(controller) as RequestHandler,
		);

		const authService = Container.get(AuthService);

		for (const [handlerName, route] of metadata.routes) {
			const argTypes = Reflect.getMetadata(
				'design:paramtypes',
				controller,
				handlerName,
			) as unknown[];
			const handler = async (req: Request, res: Response) => {
				// TODO: remove this default args once all routes have been migrated
				let args: unknown[] = [req, res];
				if (route.args?.length) {
					args = [];
					for (let index = 0; index < route.args.length; index++) {
						const arg = route.args[index];
						if (arg.type === 'req') args.push(req);
						else if (arg.type === 'res') args.push(res);
						else if (arg.type === 'param') args.push(req.params[arg.key]);
						else if (['body', 'query'].includes(arg.type)) {
							const paramType = argTypes[index] as ZodClass;
							if (paramType && 'parse' in paramType) {
								const output = paramType.safeParse(req[arg.type]);
								if (output.success) args.push(output.data);
								else {
									return res.status(400).json(output.error.errors[0]);
								}
							}
						} else throw new ApplicationError('Unknown arg type: ' + arg.type);
					}
				}
				return await controller[handlerName](...args);
			};

			router[route.method](
				route.path,
				...(inProduction && route.rateLimit ? [createRateLimitMiddleware(route.rateLimit)] : []),
				// eslint-disable-next-line @typescript-eslint/unbound-method
				...(route.skipAuth ? [] : [authService.authMiddleware]),
				...(route.licenseFeature ? [createLicenseMiddleware(route.licenseFeature)] : []),
				...(route.accessScope ? [createScopedMiddleware(route.accessScope)] : []),
				...controllerMiddlewares,
				...route.middlewares,
				route.usesTemplates ? handler : send(handler),
			);
		}

		app.use(prefix, router);
	}
};

export const registerControllers = (app: Application) => {
	const controllerClasses = registry.keys();
	for (const controllerClass of controllerClasses) {
		registerController(app, controllerClass);
	}
};

import type { Class } from 'n8n-core';
import type { RequestHandler } from 'express';
import type { Method, RateLimit } from './types';
import { getRoute } from './registry';

interface RouteOptions {
	middlewares?: RequestHandler[];
	usesTemplates?: boolean;
	/** When this flag is set to true, auth cookie isn't validated, and req.user will not be set */
	skipAuth?: boolean;
	/** When these options are set, calls to this endpoint are rate limited using the options */
	rateLimit?: RateLimit;
}

const RouteFactory =
	(method: Method) =>
	(path: `/${string}`, options: RouteOptions = {}): MethodDecorator =>
	(target, handlerName) => {
		const route = getRoute(target.constructor as Class<object>, String(handlerName));
		route.method = method;
		route.path = path;
		route.middlewares = options.middlewares ?? [];
		route.usesTemplates = options.usesTemplates ?? false;
		route.skipAuth = options.skipAuth ?? false;
		route.rateLimit = options.rateLimit;
	};

export const Get = RouteFactory('get');
export const Post = RouteFactory('post');
export const Put = RouteFactory('put');
export const Patch = RouteFactory('patch');
export const Delete = RouteFactory('delete');

import type { Class } from 'n8n-core';
import { getRoute } from './registry';
import type { Arg } from './types';

const ArgDecorator =
	(arg: Arg): ParameterDecorator =>
	(target, handlerName, parameterIndex) => {
		const route = getRoute(target.constructor as Class<object>, String(handlerName!));
		if (!route.args) route.args = [];
		route.args[parameterIndex] = arg;
	};

/** Injects the request object into the handler */
export const Req = ArgDecorator({ type: 'req' });

/** Injects the response object into the handler */
export const Res = ArgDecorator({ type: 'res' });

/** Injects the request body into the handler */
export const Body = ArgDecorator({ type: 'body' });

/** Injects the request query into the handler */
export const Query = ArgDecorator({ type: 'query' });

/** Injects a request parameter into the handler */
export const Param = (key: string) => ArgDecorator({ type: 'param', key });

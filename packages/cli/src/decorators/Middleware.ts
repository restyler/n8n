import type { Class } from 'n8n-core';
import { getControllerMetadata } from './registry';

export const Middleware = (): MethodDecorator => (target, handlerName) => {
	const metadata = getControllerMetadata(target.constructor as Class<object>);
	metadata.middlewares.push(String(handlerName));
};

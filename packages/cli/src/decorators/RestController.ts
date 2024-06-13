import { Service } from 'typedi';
import type { Class } from 'n8n-core';
import { getControllerMetadata } from './registry';

export const RestController =
	(basePath: `/${string}` = '/'): ClassDecorator =>
	(target: object) => {
		const metadata = getControllerMetadata(target as Class<object>);
		metadata.basePath = basePath;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return Service()(target);
	};

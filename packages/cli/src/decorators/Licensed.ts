import type { Class } from 'n8n-core';
import type { BooleanLicenseFeature } from '@/Interfaces';
import { getRoute } from './registry';

export const Licensed =
	(licenseFeature: BooleanLicenseFeature): MethodDecorator =>
	(target, handlerName) => {
		const route = getRoute(target.constructor as Class<object>, String(handlerName));
		route.licenseFeature = licenseFeature;
	};

import { Response } from 'express';
import { BinaryDataService, FileNotFoundError, BinaryDataStoredModes } from 'n8n-core';
import { Get, Query, Res, RestController } from '@/decorators';
import { z } from 'zod';
import { Z } from 'zod-class';

export class GetBinaryData extends Z.class({
	id: z
		.string({
			required_error: 'Missing binary data ID',
			invalid_type_error: 'Invalid binary data ID',
		})
		.regex(new RegExp(`^(${BinaryDataStoredModes.join('|')}):`)),
	action: z.literal('view').or(z.literal('download')),
	fileName: z.string().optional(),
	mimeType: z.string().optional(),
}) {}

@RestController('/binary-data')
export class BinaryDataController {
	constructor(private readonly binaryDataService: BinaryDataService) {}

	@Get('/')
	async get(@Query query: GetBinaryData, @Res res: Response) {
		try {
			if (!query.fileName || !query.mimeType) {
				try {
					const metadata = await this.binaryDataService.getMetadata(query.id);
					query.fileName = metadata.fileName;
					query.mimeType = metadata.mimeType;
					res.setHeader('Content-Length', metadata.fileSize);
				} catch {}
			}

			if (query.mimeType) res.setHeader('Content-Type', query.mimeType);

			if (query.action === 'download' && query.fileName) {
				const encodedFilename = encodeURIComponent(query.fileName);
				res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"`);
			}

			return await this.binaryDataService.getAsStream(query.id);
		} catch (error) {
			if (error instanceof FileNotFoundError) return res.writeHead(404).end();
			else throw error;
		}
	}
}

import type { INodeProperties } from 'n8n-workflow';
import { metadataFilterField } from '../../../../utils/sharedFields';

export const loadOperationDescription: INodeProperties[] = [
	{
		displayName: 'Query',
		name: 'query',
		type: 'string',
		default: '',
		required: true,
		description: 'Query to search for documents',
		displayOptions: {
			show: {
				operation: ['load'],
			},
		},
	},
	{
		displayName: 'Limit',
		name: 'topK',
		type: 'number',
		default: 4,
		description: 'Number of top results to fetch from vector store',
		displayOptions: {
			show: {
				operation: ['load'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [metadataFilterField],
		displayOptions: {
			show: {
				operation: ['load'],
			},
		},
	},
];
import {
	INodeProperties,
} from 'n8n-workflow';

export const customerCardOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		default: 'get',
		description: 'Operation to perform',
		options: [
			{
				name: 'Add',
				value: 'add',
				description: 'Add a customer card',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a customer card',
			},
			{
				name: 'Remove',
				value: 'remove',
				description: 'Remove a customer card',
			},
		],
		displayOptions: {
			show: {
				resource: [
					'customerCard',
				],
			},
		},
	},
] as INodeProperties[];

export const customerCardFields = [
	// ----------------------------------
	//        customerCard: add
	// ----------------------------------
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the customer to be associated with this card',
		displayOptions: {
			show: {
				resource: [
					'customerCard',
				],
				operation: [
					'add',
				],
			},
		},
	},
	{
		displayName: 'Card Token',
		name: 'token',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'tok_1IMfKdJhRTnqS5TKQVG1LI9o',
		description: 'Token representing sensitive card information',
		displayOptions: {
			show: {
				resource: [
					'customerCard',
				],
				operation: [
					'add',
				],
			},
		},
	},

	// ----------------------------------
	//       customerCard: remove
	// ----------------------------------
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the customer whose card to remove',
		displayOptions: {
			show: {
				resource: [
					'customerCard',
				],
				operation: [
					'remove',
				],
			},
		},
	},
	{
		displayName: 'Card ID',
		name: 'cardId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the card to remove',
		displayOptions: {
			show: {
				resource: [
					'customerCard',
				],
				operation: [
					'remove',
				],
			},
		},
	},

	// ----------------------------------
	//         customerCard: get
	// ----------------------------------
	{
		displayName: 'Customer ID',
		name: 'customerId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the customer whose card to retrieve',
		displayOptions: {
			show: {
				resource: [
					'customerCard',
				],
				operation: [
					'get',
				],
			},
		},
	},
	{
		displayName: 'Source ID',
		name: 'sourceId',
		type: 'string',
		required: true,
		default: '',
		description: 'ID of the source to retrieve',
		displayOptions: {
			show: {
				resource: [
					'customerCard',
				],
				operation: [
					'get',
				],
			},
		},
	},
] as INodeProperties[];
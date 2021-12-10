import { parse } from 'flatted';
// import { v4 as uuid } from 'uuid';
import {
	IBinaryData,
	INodeExecutionData,
	IRun,
	IRunData,
	IRunExecutionData,
	ITaskData,
} from 'n8n-workflow';
import { BINARY_ENCODING } from '../Constants';
import { IBinaryDataConfig, IBinaryDataManager, IExecutionFlattedDb } from '../Interfaces';
import { BinaryDataFileSystem } from './FileSystem';

export class BinaryDataManager {
	private static instance: BinaryDataManager;

	private managers: {
		[key: string]: IBinaryDataManager;
	};

	private binaryDataMode: string;

	private availableModes: string[];

	constructor(config: IBinaryDataConfig) {
		this.binaryDataMode = config.mode;
		this.availableModes = config.availableModes.split(',');
		this.managers = {};
	}

	static async init(config: IBinaryDataConfig, mainManager = false): Promise<void> {
		if (BinaryDataManager.instance) {
			throw new Error('Binary Data Manager already initialized');
		}

		BinaryDataManager.instance = new BinaryDataManager(config);

		if (BinaryDataManager.instance.availableModes.includes('filesystem')) {
			BinaryDataManager.instance.managers.filesystem = new BinaryDataFileSystem(config);
			await BinaryDataManager.instance.managers.filesystem.init(mainManager);
		}

		return undefined;
	}

	static getInstance(): BinaryDataManager {
		if (!BinaryDataManager.instance) {
			throw new Error('Binary Data Manager not initialized');
		}

		return BinaryDataManager.instance;
	}

	async storeBinaryData(binaryData: IBinaryData, binaryBuffer: Buffer): Promise<IBinaryData> {
		const retBinaryData = binaryData;

		if (this.managers[this.binaryDataMode]) {
			return this.managers[this.binaryDataMode].storeBinaryData(binaryBuffer).then((filename) => {
				retBinaryData.id = this.generateBinaryId(filename);
				return retBinaryData;
			});
		}

		retBinaryData.data = binaryBuffer.toString(BINARY_ENCODING);
		return binaryData;
	}

	async retrieveBinaryData(binaryData: IBinaryData): Promise<Buffer> {
		if (binaryData.id) {
			return this.retrieveBinaryDataByIdentifier(binaryData.id);
		}

		return Buffer.from(binaryData.data, BINARY_ENCODING);
	}

	async retrieveBinaryDataByIdentifier(identifier: string): Promise<Buffer> {
		const { mode, id } = this.splitBinaryModeFileId(identifier);
		if (this.managers[mode]) {
			return this.managers[mode].retrieveBinaryDataByIdentifier(id);
		}

		throw new Error('Storage mode used to store binary data not available');
	}

	async findAndMarkDataForDeletionFromFullRunData(fullRunData: IRun): Promise<void> {
		if (this.managers[this.binaryDataMode]) {
			const identifiers = this.findBinaryDataFromRunData(fullRunData.data.resultData.runData);
			return this.markDataForDeletion(identifiers);
		}

		return Promise.resolve();
	}

	async findAndDeleteBinaryData(fullExecutionDataList: IExecutionFlattedDb[]): Promise<unknown> {
		if (this.availableModes.length > 0) {
			const allIdentifiers: string[] = [];

			fullExecutionDataList.forEach((fullExecutionData) => {
				const { runData } = (parse(fullExecutionData.data) as IRunExecutionData).resultData;

				allIdentifiers.push(...this.findBinaryDataFromRunData(runData));
			});

			return Promise.all(
				allIdentifiers.map(async (identifier) => this.deleteBinaryDataByIdentifier(identifier)),
			);
		}

		return Promise.resolve();
	}

	private async deleteBinaryDataByIdentifier(identifier: string): Promise<void> {
		const { mode, id } = this.splitBinaryModeFileId(identifier);
		if (this.managers[mode]) {
			return this.managers[mode].deleteBinaryDataByIdentifier(id);
		}

		return Promise.resolve();
	}

	private generateBinaryId(filename: string) {
		return `${this.binaryDataMode}:${filename}`;
	}

	private splitBinaryModeFileId(fileId: string): { mode: string; id: string } {
		const [mode, id] = fileId.split(':');
		return { mode, id };
	}

	private async duplicateBinaryDataInExecData(
		executionData: INodeExecutionData,
	): Promise<INodeExecutionData> {
		const binaryManager = this.managers[this.binaryDataMode];

		if (executionData.binary) {
			const binaryDataKeys = Object.keys(executionData.binary);
			const bdPromises = binaryDataKeys.map(async (key: string) => {
				if (!executionData.binary) {
					return { key, newId: undefined };
				}

				const binaryDataId = executionData.binary[key].id;
				if (!binaryDataId) {
					return { key, newId: undefined };
				}

				return binaryManager
					?.duplicateBinaryDataByIdentifier(this.splitBinaryModeFileId(binaryDataId).id)
					.then((filename) => ({
						newId: this.generateBinaryId(filename),
						key,
					}));
			});

			return Promise.all(bdPromises).then((b) => {
				return b.reduce((acc, curr) => {
					if (acc.binary && curr) {
						acc.binary[curr.key].id = curr.newId;
					}

					return acc;
				}, executionData);
			});
		}

		return executionData;
	}

	async duplicateBinaryData(
		inputData: Array<INodeExecutionData[] | null> | unknown,
	): Promise<INodeExecutionData[][]> {
		if (inputData && this.managers[this.binaryDataMode]) {
			const returnInputData = (inputData as INodeExecutionData[][]).map(
				async (executionDataArray) => {
					if (executionDataArray) {
						return Promise.all(
							executionDataArray.map((executionData) => {
								if (executionData.binary) {
									return this.duplicateBinaryDataInExecData(executionData);
								}

								return executionData;
							}),
						);
					}

					return executionDataArray;
				},
			);

			return Promise.all(returnInputData);
		}

		return Promise.resolve(inputData as INodeExecutionData[][]);
	}

	private async markDataForDeletion(identifiers: string[]): Promise<void> {
		if (this.managers[this.binaryDataMode]) {
			return this.managers[this.binaryDataMode].markDataForDeletion(
				identifiers.map((id) => this.splitBinaryModeFileId(id).id),
			);
		}

		return Promise.resolve();
	}

	private findBinaryDataFromRunData(runData: IRunData): string[] {
		const allIdentifiers: string[] = [];

		Object.values(runData).forEach((item: ITaskData[]) => {
			item.forEach((taskData) => {
				if (taskData?.data) {
					Object.values(taskData.data).forEach((connectionData) => {
						connectionData.forEach((executionData) => {
							if (executionData) {
								executionData.forEach((element) => {
									if (element?.binary) {
										Object.values(element?.binary).forEach((binaryItem) => {
											if (binaryItem.id) {
												allIdentifiers.push(binaryItem.id);
											}
										});
									}
								});
							}
						});
					});
				}
			});
		});

		return allIdentifiers;
	}
}
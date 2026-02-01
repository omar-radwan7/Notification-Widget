import Client, {
  SubscribeRequest,
  SubscribeUpdate,
} from '@triton-one/yellowstone-grpc';
import { PUMP_FUN_PROGRAM_ID, parseBuyEvent, BuyEvent } from './pump-parser';

export type BuyEventCallback = (event: BuyEvent) => void;

export class GrpcClient {
  private client: Client;
  private stream: ReturnType<Client['subscribe']> | null = null;
  private onBuyEvent: BuyEventCallback;

  constructor(endpoint: string, token: string, onBuyEvent: BuyEventCallback) {
    this.client = new Client(endpoint, token, {});
    this.onBuyEvent = onBuyEvent;
  }

  async subscribe(): Promise<void> {
    const request: SubscribeRequest = {
      accounts: {},
      slots: {},
      transactions: {
        pumpfun: {
          vote: false,
          failed: false,
          accountInclude: [PUMP_FUN_PROGRAM_ID],
          accountExclude: [],
          accountRequired: [],
        },
      },
      blocks: {},
      blocksMeta: {},
      entry: {},
      accountsDataSlice: [],
      commitment: 1, // CONFIRMED
      transactionsStatus: {},
    };

    this.stream = await this.client.subscribe();

    this.stream.on('data', (update: SubscribeUpdate) => {
      this.handleUpdate(update);
    });

    this.stream.on('error', (error: Error) => {
      console.error('gRPC stream error:', error);
      this.reconnect();
    });

    this.stream.on('end', () => {
      console.log('gRPC stream ended, reconnecting...');
      this.reconnect();
    });

    await new Promise<void>((resolve, reject) => {
      if (!this.stream) return reject(new Error('Stream not initialized'));
      this.stream.write(request, (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('Subscribed to pump.fun transactions');
  }

  private handleUpdate(update: SubscribeUpdate): void {
    if (!update.transaction?.transaction) return;

    const { transaction, slot } = update.transaction;
    const signature = Buffer.from(transaction.signature).toString('base64');
    const timestamp = Date.now();

    const message = transaction.transaction?.message;
    if (!message) return;

    const accountKeys = message.accountKeys.map((key) =>
      Buffer.from(key).toString('base58')
    );

    for (const instruction of message.instructions) {
      const programId = accountKeys[instruction.programIdIndex];
      
      if (programId !== PUMP_FUN_PROGRAM_ID) continue;

      const instructionAccounts = instruction.accounts.map(
        (idx) => accountKeys[idx]
      );
      const data = Buffer.from(instruction.data);

      const buyEvent = parseBuyEvent(
        signature,
        instructionAccounts,
        data,
        timestamp
      );

      if (buyEvent) {
        this.onBuyEvent(buyEvent);
      }
    }
  }

  private async reconnect(): Promise<void> {
    console.log('Attempting to reconnect in 5 seconds...');
    setTimeout(() => this.subscribe(), 5000);
  }

  close(): void {
    if (this.stream) {
      this.stream.end();
      this.stream = null;
    }
  }
}

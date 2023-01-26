import * as t_AWS from 'aws-sdk';
import * as t_https from 'https';
import * as t_mysql from 'mysql2/promise';
import { handler } from './handler';
import {expect, jest, test} from '@jest/globals';
import { strictEqual } from 'assert';

jest.mock('aws-sdk');
jest.mock('https');
jest.mock('mysql2/promise');

describe('handler', () => {
    const AWS = require('aws-sdk') as any as jest.Mocked<typeof t_AWS>;
    const https = require('https') as any as jest.Mocked<typeof t_https>;
    const mysql = require('mysql2/promise') as any as jest.Mocked<typeof t_mysql>;

    let sqs = new AWS.SQS() as any as jest.Mocked<typeof t_AWS.SQS>;

    beforeEach(() => {
        sqs.deleteMessage
            .mockReturnValue({
                promise: jest.fn().mockResolvedValue(null)
            });
        mysql.createConnection.mockReturnValue({
            execute: jest.fn().mockResolvedValue(null),
            close: jest.fn(),
        });
        https.request.mockImplementation((options: https.RequestOptions, callback: (res: https.IncomingMessage) => void) => {
            callback({
                on: jest.fn(),
            });
            return {
                write: jest.fn(),
                end: jest.fn(),
            };
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should process the message and send https post request, update mysql and delete message from sqs queue', async () => {
        const message = { id: '123', text: 'Hello World' };
        const event: AWS.SQSEvent = {
            Records: [{
                body: JSON.stringify(message),
                receiptHandle: 'receipt-handle',
            }],
        };
        await handler(event);
        expect(sqs.deleteMessage).toHaveBeenCalledWith({
            QueueUrl: 'https://sqs.us-east-1.amazonaws.com/1234567890/my-queue',
            ReceiptHandle: 'receipt-handle',
        });
        expect(mysql.createConnection).toHaveBeenCalledWith({
            host: 'your-rds-endpoint',
            user: 'username',
            password: 'password',
            database: 'your-database-name',
        });
        expect(https.request).toHaveBeenCalledWith({
            hostname: 'example.com',
            port: 443,
            path: '/path',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        }, expect.any(Function));
    });
});

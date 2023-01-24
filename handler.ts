import * as AWS from 'aws-sdk';
import * as https from 'https';
import * as mysql from 'mysql2/promise';

const sqs = new AWS.SQS();
const queueUrl = 'https://sqs.us-east-1.amazonaws.com/1234567890/my-queue';

export const handler = async (event: any) => {
    const sqsRecord = event.Records[0];
    const message = JSON.parse(sqsRecord.body);
    // process the message here

    // send https post request
    const options = {
        hostname: 'example.com',
        port: 443,
        path: '/path',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    };
    const req = https.request(options, (res) => {
        res.on('data', (d) => {
            process.stdout.write(d);
        });
    });
    req.write(JSON.stringify(message));
    req.end();

    // update mysql database
    const connection = await mysql.createConnection({
        host: 'your-rds-endpoint',
        user: 'username',
        password: 'password',
        database: 'your-database-name',
    });
    await connection.execute(
        'UPDATE your_table SET message = ? WHERE id = ?',
        [message, message.id]);
    connection.destroy();

    // delete message from sqs queue
    await sqs
        .deleteMessage({
            QueueUrl: queueUrl,
            ReceiptHandle: sqsRecord.receiptHandle,
        })
        .promise();
};

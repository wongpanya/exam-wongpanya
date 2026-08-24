const mongoose = require('mongoose');

const withTransaction = async (work) => {
    const session = await mongoose.startSession();
    let output;
    try {
        try {
            await session.withTransaction(async () => {
                output = await work(session);
            });
            return output;
        } catch (error) {
            const message = String(error?.message || '');
            const unsupported = message.includes('Transaction numbers are only allowed')
                || message.includes('replica set member or mongos');
            if (!unsupported) throw error;
            // Local standalone MongoDB cannot transact. The production Atlas path still uses a transaction.
            return work(null);
        }
    } finally {
        await session.endSession();
    }
};

module.exports = withTransaction;

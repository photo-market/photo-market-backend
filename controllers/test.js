/**
 * GET /test/throw
 */
exports.getThrow = (req, res) => {
    throw new Error('Uh oh!');
};

exports.getThrowCatch = (req, res) => {
    try {
        throw new Error('Uh oh!');
    } catch (e) {
        console.log(e);
    }
};

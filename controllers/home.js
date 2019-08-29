/**
 * GET /
 * Home page.
 */
exports.index = (req, res) => {
    res.send({content: 'Hello World'});
};

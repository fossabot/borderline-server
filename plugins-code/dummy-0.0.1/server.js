
function DummyPlugin() {
};

DummyPlugin.prototype.attach = function(expressAppRouter) {
    expressAppRouter.get('/dummy', this.dummy);
};

DummyPlugin.prototype.detach = function() {
};

DummyPlugin.prototype.dummy = function(req, res) {
    res.status(200);
    res.send('Dumb dummy');
    var txt = borderline.fs.readFile('test.txt');
    console.log('Read: ' + txt);
};

module.exports = DummyPlugin;

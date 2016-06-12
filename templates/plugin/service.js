var fs = blog.modules.fs;
var db = blog.modules.db;
var path = blog.modules.path;

// synchronous method
exports.method_name = function(req, res) {
    try{
        // your codes here

        return { success: true, message: "Your information here." };    
    }catch(e){
        return { success: false, message: "Your information here." };    
    }
};

// asynchronous method
exports.method_async = function (req, res, callback) {
    callback({
        success: true,
        message: 'Your information here.'
    });
};
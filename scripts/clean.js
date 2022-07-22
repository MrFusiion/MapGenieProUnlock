const fs = require('fs');
const path = require('path');

//Clear build folder
if (fs.existsSync(path.resolve('./build'))) {
    fs.rm(path.resolve('./build'), { recursive: true }, (err) => {
        if (err) throw err;
        console.log('Cleaned build folder');
    });
}
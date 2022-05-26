const fs = require('fs');
const path = require('path');

if (fs.existsSync(path.resolve('./build'))) {
    fs.rm(path.resolve('./build'), { recursive: true }, (err) => {
        if (err) throw err;
        console.log('Cleaned build folder');
    });
}
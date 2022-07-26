const yargs = require("yargs/yargs");

yargs(process.argv.slice(2))
    .command("build", false, yargs => yargs, (argv) => {
        require("./build")(argv);
    }).command("build-dist", false, yargs => yargs, (argv) => {
        require("./build_dist")(argv);
    }).command("clean", false, yargs => {
        return yargs
            .option("mode", {
                alias: "m",
                default: "dist|build",
                description: "Mode dist, build or dist-build."
            });
    }, (argv) => {
        require("./clean")(argv);
    }).command("watch", false, yargs => {
        return yargs
            .option("build-timeout", {
                alias: "t",
                default: 1000,
                description: "Delay between builds."
            });
    }, (argv) => {
        require("./watch")(argv);
    })
    .options({
        "browser": {
            alias: "b",
            default: "chrome-firefox",
            description: "Specify for which browser u want to build \"chrome\", \"firefox\" or both with \"chrome-firefox\"."
        },
        "debug": {
            alias: "d",
            type: "boolean",
            default: false,
            description: "Enabled this when building the extension just for testing. This will not sign the firefox version."
        },
        "source-dir": {
            alias: "sd",
            default: "src",
            description: "The source folder for the extension."
        },
        "build-dir": {
            alias: "bd",
            default: "build",
            description: "The build folder for the extension. The extension will be build here."
        },
        "dist-dir": {
            alias: "dd",
            default: "dist",
            description: "The dist folder for the extension. All binaries will be put here."
        },
    })
    .strictCommands()
    .demandCommand(1)
    .parse();
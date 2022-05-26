function argv() {
    const _argv = process.argv.slice(2);
    const _options = {};
    const _aliases = {};
    const options = {};
    const optionsStack = [];
    const values = [];
    const _this = this;

    function addOption(option) {
        if (!option.name) throw new Error('option.name is required');
        if (option.flag && option.default) throw new Error('flag options cannot have default values'); 

        if (!_options[option.name]) {
            _options[option.name] = {
                'aliases': option.aliases || [],
                'default': option.flag ? false : option.default || null,
                'flag': option.flag || false
            };
            
            const aliases = option.aliases || [];
            for (const alias of aliases) {
                if (!_aliases[alias]) {
                    _aliases[alias] = option.name;
                } else {
                    throw new Error(`alias ${alias} already exists for option ${_aliases[alias]}`);
                }
            }
        } else {
            throw new Error(`Option ${name} already exists`);
        }
        return _this;
    }

    function getOption(name, defaultValue=undefined) {
        const val = options[name];
        const o = _options[name]; 

        if (typeof val !== 'undefined') {
            return val;
        } else if (typeof val === 'undefined' && typeof o.default !== 'undefined') {
            return o.default;
        } else if (typeof defaultValue !== 'undefined') {
            return defaultValue
        } else {
            throw new Error(`no option "${name}" given!`);
        }
    }

    function getOptions() {
        const opts = {};
        for (const name in _options) {
            opts[name] = getOption(name);
        }
        return opts;
    }

    function parse() {
        for (let i = 0; i < _argv.length; i++) {
            const val = _argv[i].match(/-{0,2}(.+)/)?.[1];
            const option = _options[val] ? val : _aliases[val] || null;

            if (option) {
                const o = _options[option];
                if (!o) throw new Error(`Unknown option: ${option}`);
                if (optionsStack.length > 0) throw new Error(`Option ${optionsStack.pop()} has no value!`);
                if (o.flag) {
                    options[option] = true;
                } else {
                    options[option] = o.default || null;
                    optionsStack.push(option);
                }
            } else {
                const name = optionsStack.pop();
                const o = name && _options[name];
                if (o && !o.flag) {
                    if (options) {
                        options[name] = val;
                    }
                } else if (o && o.flag) {
                    throw new Error(`Option ${name} is a flag!`);
                } else if (!name) {
                    values.push(val);
                }
            }
        }

        if (options['help']) {
            console.log(`Usage: ${process.argv[1]} [options] [values]`);
            console.log('Options:');
            for (const name in _options) {
                const o = _options[name];
                console.log(`  ${name} | ${o.aliases.join(', ')}`);
            }
            process.exit(0);
        }

        return _this;
    }

    function help() {
        return addOption({
            name: 'help',
            aliases: ['h', '/?'],
            flag: true,
        });
    }

    this.addOption = addOption;
    this.getOption = getOption;
    this.getOptions = getOptions;
    this.parse = parse;
    this.values = values;
    this.options = options;
    this.help = help;
    return this;
}

module.exports = argv;
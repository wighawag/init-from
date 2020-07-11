#!/usr/bin/env node
const mri = require('mri');
const path = require('path');
const chalk = require('chalk');
const gittar = require('gittar');
const homedir = require('os').homedir;
const ver = require('../package').version;
const fs = require('fs');
const rimraf = require('rimraf');
const dots = require('dot');

const changeCase = require('change-case');

dots.templateSettings = {
	evaluate: /\{\{([\s\S]+?)\}\}/g,
	interpolate: /\{\{=([\s\S]+?)\}\}/g,
	encode: /\{\{!([\s\S]+?)\}\}/g,
	use: /\{\{#([\s\S]+?)\}\}/g,
	define: /\{\{##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\}\}/g,
	conditional: /\{\{%(%)?\s*([\s\S]*?)\s*\}\}/g,
	iterate: /\{\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})/g,
	varname: 'it, _',
	strip: false,
	append: true,
	selfcontained: false,
};

const args = process.argv.slice(2);
const home = homedir();
const alias = { c: 'cache', f: 'force', h: 'help' };

const fixedArgs = [];
let looking = false;
let composed = '';
let logFixedArgs = false;
for (const arg of args) {
	if (arg.startsWith('-')) {
		if (composed !== '') {
			fixedArgs.push(composed);
		}
		looking = true;
		composed = '';
		fixedArgs.push(arg);
		if (arg === '--log') {
			logFixedArgs = true;
		}
	} else {
		if (looking) {
			if (composed !== '') {
				composed += ' ';
			}
			composed += arg;
		} else {
			fixedArgs.push(arg);
		}
	}
}
if (composed !== '') {
	fixedArgs.push(composed);
}

if (logFixedArgs) {
	console.log({ args, fixedArgs });
}

const flags = mri(fixedArgs, { alias });

if (flags.log) {
	console.log(JSON.stringify(flags, null, '  '));
}

const repo = flags._[0];
const dest = path.resolve((flags.home && home) || flags._[1] || '.');

if (flags.help || !repo) {
	const _ = chalk.underline;
	return console.log(`
  ${_('Usage')}
    $ init-from <repo> [target]

  ${_('Options')}
    --cache -c    Disable HTTP requests; offline mode.
    --force -f    Prefer to download a new archive.
		 --help -h    Display this help message.
		 --values     name:value,name:value,...

  ${_('Examples')}
    $ init-from vutran/boiler
    $ init-from vutran/boiler my-app
    $ init-from vutran/boiler#v1.2.0
    $ init-from gitlab:vutran/boiler
    $ init-from vutran/boiler --cache
	`);
	// TODO examples with values
}

const log = msg => console.log(chalk.magenta('> ') + msg);

gittar
	.fetch(repo, {
		useCache: flags.cache,
		force: flags.force,
	})
	.then(file => {
		log(`sourcing ${file.replace(home, '~')}`);
		log(`targeting ${dest === home ? home : dest.replace(home, '~')}`);

		gittar
			.extract(file, dest)
			.then(() => {
				const variables = flags;
				const utils = changeCase;

				let configContent;
				try {
					configContent = fs.readFileSync('.init-from.json').toString();
				} catch (e) {
					try {
						configContent = fs.readFileSync('.zel').toString();
					} catch (e) {}
				}
				let config = {};
				if (configContent) {
					config = JSON.parse(configContent);
				}

				let filter = n => n !== '.zel' && n !== '.init-from.json';
				if (config.files && config.files.length > 0) {
					const fileMap = {};
					for (const fileName of config.files) {
						fileMap[fileName] = true;
					}
					filter = filename => fileMap[filename];
				}

				if (config.dependencies) {
					throw new Error('dependencies not supported yet');
				}

				const refs = {};
				if (config.variables) {
					for (const varDef of config.variables) {
						if (!variables[varDef.name]) {
							if (!varDef.defaultValue && !varDef.ref && varDef.required) {
								throw new Error(`variable ${varDef.name} required`);
							} else {
								if (varDef.defaultValue) {
									variables[varDef.name] = varDef.defaultValue;
								} else if (varDef.ref) {
									refs[varDef.name] = varDef;
								}
							}
						}
					}
				}

				for (const ref of Object.keys(refs)) {
					const toRef = refs[ref];
					refVar = variables[toRef.ref];
					if (typeof refVar === 'undefined' && toRef.required) {
						throw new Error(
							`variable ${varDef.name} required on its own or through ${toRef.ref}`
						);
					}
					variables[ref] = refVar;
				}

				if (typeof variables.name === 'undefined') {
					variables.name = changeCase.capitalCase(dest);
				}

				if (flags.log) {
					console.log(JSON.stringify(variables, null, '  '));
				}

				function traverse(dir, result = [], topDir, step = 0) {
					const dirFiles = fs.readdirSync(dir);
					// console.log(step, dirFiles);
					dirFiles.forEach(name => {
						const fPath = path.resolve(dir, name);
						const stats = fs.statSync(fPath);
						const fileStats = {
							name,
							path: fPath,
							relativePath: path.relative(topDir || dir, fPath),
							mtimeMs: stats.mtimeMs,
							directory: stats.isDirectory(),
						};
						// console.log(step, {
						// 	dir,
						// 	name,
						// 	topDir,
						// 	fPath,
						// 	directory: fileStats.directory,
						// });

						if (!filter(fileStats.relativePath)) {
							// TODO change \ into /
							rimraf.sync(fileStats.path);
						} else {
							const template = dots.template(name);
							const newName = template(variables, utils);
							// console.log(`${name} -> ${newName}`);
							if (newName == '') {
								// console.log(step, `deleting ${fileStats.name} ...`);
								rimraf.sync(fileStats.path);
							} else {
								const newPath = path.join(
									path.dirname(fileStats.path),
									newName
								);
								// console.log(
								//   step,
								//   `renaming ${fileStats.name} ... (${fileStats.path} -> ${newPath})`
								// );
								fs.renameSync(fileStats.path, newPath);
								fileStats.path = newPath;
								fileStats.name = newName;
								fileStats.relativePath = path.relative(
									topDir || dir,
									fileStats.path
								);
								if (fileStats.directory) {
									result.push(fileStats);
									return traverse(
										fileStats.path,
										result,
										topDir || dir,
										++step
									);
								}
								result.push(fileStats);
							}
						}
					});
					return result;
				}
				const files = traverse(dest);
				for (const file of files) {
					if (!file.directory) {
						const content = fs.readFileSync(file.path).toString();
						const template = dots.template(content);
						const newContent = template(variables, utils);
						// console.log({ content, newContent });
						fs.writeFileSync(file.path, newContent);
					}
				}
			})
			.catch(e => {
				console.error('ERROR', e);
				// TODO delete folder ?
			});
	});

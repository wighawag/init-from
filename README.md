# init-from

> `init-from` is a small, and simple command-line tool that helps kickstart new projects.

It is based on `zel` : https://github.com/vutran/zel 
It simply add a templating system on top so new project can be automatically configured

### Benefits

- Simple JSON file to specify files via a `.zel` file
- No complex generator/plugin API
- No need to publish your boilerplate on npm (there's too many!)

## Install

```
$ npm i -g init-from
```

## Usage

Create a `.zel` file in your boilerplate repository on GitHub and specify the files to expose to `init-from` and `zel` (if you do not need templating.

#### Repository: `vutran/editorconfig`
```json
{
    "files": [".editorconfig"]
}
```

### Running `init-from`

To quickly clone these files, simply run `init-from <username>/<repository>`.

```
$ init-from vutran/editorconfig
```

The above command will download `.editorconfig` from the [`vutran/editorconfig`](https://github.com/vutran/editorconfig) repository into the current working directory.

That's it!

### Dependencies

Sometimes, your boilerplate may depend on other boilerplates. You can depend on other repositories by adding it to the `dependencies` list in your `.zel` file.

#### Repository: `vutran/new`

```json
{
    "dependencies": [
        "vutran/editorconfig",
        "vutran/gitignore"
    ]
}
```

And to bootstrap your new project:

```
$ init-from vutran/new
```

## Commands

Scaffold a project

```
$ init-from vutran/new
```

Scaffolding a private GitHub repository

```
$ init-from vutran/new --token abc123
```

Specifying a target directory for your new project

```
$ init-from vutran/new --target ~/Project/MyNewProject
```

Want to scaffold your user home directory?

```
$ init-from vutran/home --home
```

For more information

```
$ init-from -h
```

## Contributing

1. Clone the repository: `git clone git@github.com:wighawag/init-from.git`
2. Install dependencies: `npm install` or `yarn`
3. Install [flow-typed](https://github.com/flowtype/flow-typed) typings: `npm run flow-typed`
4. Start [Fly](https://github.com/flyjs/fly) dev task: `npm run dev`
5. Make edits, commit
6. Submit a [PR](https://github.com/wighawag/init-from/compare).

## License

MIT © [Vu Tran](https://github.com/vutran/) and [Ronan Sandford](https://github.com/wighawag/)

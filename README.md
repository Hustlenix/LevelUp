# Level Up

Level Up is a website I built to make a long self-improvement video easier to learn from and actually use.

Live website: https://hustlenix.github.io/LevelUp/

## Description

I originally made Level Up because I had a long video with a lot of useful information in it, but going back through a 20-hour video every time I wanted to find something was not practical.

So I started turning the ideas into readable chapters.

After that I kept adding things I wanted for myself, like search, quizzes, highlights, goals, focus sessions, progress tracking and study tools.

The project now has 28 chapters and a bunch of tools around them. It also has a small companion called Milo. Milo reacts to things you do inside the website, such as finishing focus sessions or making progress.

Most of the important data is stored locally in the browser, so the main app does not need an account.

### Screenshot

![Level Up homepage](public/devlog/after-home.png)

## Getting Started

### Dependencies

You need:

- Node.js
- npm
- Git

### Installing

Clone the project:

```bash
git clone https://github.com/Hustlenix/LevelUp.git
cd LevelUp
```

Install the packages:

```bash
npm install
```

### Executing program

Run the development server:

```bash
npm run dev
```

Open this in your browser:

```text
http://localhost:3000
```

To test a production build:

```bash
npm run build
npm start
```

## Useful Commands

Run the linter:

```bash
npm run lint
```

Run the tests:

```bash
npm test
```

Build the project:

```bash
npm run build
```

## Help

If the project is not starting, try installing the dependencies again:

```bash
npm install
```

If the GitHub Pages version is not loading correctly, check that links and asset paths work with the `/LevelUp` base path.

You can also check the Actions tab on GitHub to see if the latest build or deployment failed.

## Why I Made This

I did not want this to be another website where I read something once and then forget about it.

The goal was to make the information easier to return to and give myself tools to actually do something with it.

Level Up has grown a lot since the first version, and I am still improving it.

## License

The written content in this project is licensed under the Creative Commons Attribution-NonCommercial 4.0 International license.

See [LICENSE](LICENSE) for the full details.

The source code is not included under that content license unless it is explicitly stated.

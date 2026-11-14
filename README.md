<h1 align="center">
  <br>
  <img width="150" src="logo.svg" alt="cInjector Logo"> 
  <br>
  <p align="center">cInjector</p>
</h1>

A Custom CSS Injection Extension for Firefox.

---

## Screenshots

<img width="1000" src="screenshots/screenshot-1.png" alt="Screenshot 1">
<img width="500" style="display:block;margin:auto;" src="screenshots/screenshot-2.png" alt="Screenshot 2">
<img width="1000" src="screenshots/screenshot-3.png" alt="Screenshot 3">

## Development

**Installing the Extension for Development:**

Go to [this page](about:debugging#/runtime/this-firefox), click on "Load Temporary Add-on..." and select the manifest.json inside of this Folder.

**Reloading the Extension:**

Rebuild:

```sh
npm run build
```

Then, go to [this page](about:debugging#/runtime/this-firefox) and click on reload below the "Custom CSS Injector" addon.

## Credits

For the Editor, I used [CodeMirror 6](https://codemirror.net/) so it feels like it's an actual editor.

# HTMLBuilder

A tool that allows you to generate HTML content from a template in an optimised way. Indeed, instead of adding new elements in the DOM via `innerHTML` (which is not cool), this class analyses a template & builds the elements with the `createElement()` method. This template is an easy-to-read architecture especially when there is a lot of HTML to generate.

HTMLBuilder is written in TypeScript, however there is its equivalent in JavaScript.

## Get started

Get the source code at `src/HTMLBuilder.js`. Then just add it to your project:

```html
<script src="HTMLBuilder.js"></script>
```

Then initialize an instance of HTMLBuilder.

```javascript
var builder = new HTMLBuilder();
```

## Write a template

Let's say you want to generate a button inside an element without a single line of HTML. The first thing to do is to specify the parent element in which to place the future button. How do you do this?

By default, the parent element is `document.body`. Change that in the constructor:

```javascript
var container = document.querySelector("#container");
var builder = new HTMLBuilder(container);
```

Or use:

```javascript
builder.setParent(container);
```

All right, now let's create the template of our button.

```javascript
// You absolutely need to use these quotes if you have several lines: `...`.
// Indeed, the parser reads line by line with a single element on each line.
builder.generate(`
    button
`);
```

Do you see it? A button magically appeared! However, this button is empty, it has no class, no id, nothing! Let's add those things.

In order to add a class, an id etc., you must respect a specific order:

_tagname-(class)-(id)-(content)-(attributes)-(events)_

This means that the tagname is the starting point and it is required. However, the class, the id, the content, the attributes and the events are not necessary, so you can skip them.

Each part (class, id, etc.) has its specific syntax.

| part       | model                               | example                            |
| ---------- | ----------------------------------- | ---------------------------------- |
| parent     | `<name>`                            | "button"                           |
| class      | `.<name>{0,}`                       | ".class1.class2.class3"            |
| id         | `#<name>{0,1}`                      | "#this-is-the-only-id"             |
| content    | `(<content>){0,1}`                  | "(this is content)"                |
| attributes | `[name1=value1; name2=value2]{0,1}` | "[contenteditable; data-y=[a, b]]" |
| events     | `@event1;event2{0,}`                | "@hoverMe;outOfMe"                 |

NOTE: `{0,}` means 0 ore more times & `{0,1}` means 0 or 1 time.

If you don't respect this syntax, you may get strange results...

For a better understanding, let's make a real example by comparing a real HTML element & its translation with this syntax:

```html
<button class="btn-primary" type="button" id="yeah">Click!</button>
```

```javascript
builder.generate(`
    button.btn-primary#yeah(Click!)[type=button]
`);
```

Adding events is more complex, see: [Add en event listener](#add-an-event-listener).

NOTE: HTML entities (`&amp;`, etc.) are automatically decoded.

## Build an architecture

I want to create a button inside a div. How do I do it? This is a complex situation because we need to write implicitly that one element is the child of another. Moreover, a child can be the child of a child etc.

Fortunately, the algorithm can guess by itself which element is the child of which element. Therefore, all you need to do is specify an indentation level for each line _except the first one_.

```javascript
builder.generate(`
    div.box.bg-black
        >button(Click me!)[type=button]
`);
```

Here is the result in HTML (open the console and see it by yourself):

```html
<div class="box bg-black">
  <button type="button">Click me!</button>
</div>
```

As you can see the `>` explains to the algorithm that this line has an indentation level of 1. Therefore, in order to build more sophisticated architectures, just add more of these `>`:

Example:

```html
<div class="box">
  <h1>Title</h1>
  <div class="menu">
    <ul>
      <li>Item 1</li>
      <li>Item 2</li>
      <li>Item 3</li>
    </ul>
  </div>
  <div class="section">
    <h2>I have actually no idea</h2>
  </div>
</div>
```

The above HTML code is generated thanks to:

```javascript
builder.generate(`
    div.box
        >h1(Title)
        >div.menu
            >>ul
                >>>li(Item 1)
                >>>li(Item 2)
                >>>li(Item 3)
        >div.section
            >>h2(I have actually no idea)
`);
```

Just know that you can add several elements at the same time:

```javascript
builder.generate(`
    div.box
        >h1(Title)
        >div.menu
            >>ul
                >>>li(Item 1)
                >>>li(Item 2)
                >>>li(Item 3)
        >div.section
            >>h2(I have actually no idea)
    div.another-box
        >h1(Maybe you should take a look at the technical part below)
`);
```

## Add an event listener

Once you have your button, you realize that it is completely useless without an event listener. That's what happened in my head, so... I added event listeners!

Before writing a template, you must register a new event listener. Indeed, you register an event, then its name will be used as a reference inside the template, and the algorithm will do its magic :). But how do you register an event then?

```javascript
builder.bindEvent({
  name: "sayHello", // give the listener a name in order to recognize it
  type: "click", // the type of event (click, mouseover, mouseout, etc.)
  callback: function (e) {
    console.log("You clicked me!");
  },
  options: true, // whatever you want to add as options to the event listener...
});
```

NOTE: `options` is just the third argument of the method `addEventListener()`. If you don't know what I'm talking about, check the documentation on [MDN](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener).

Afterwards, let's write our template:

```javascript
builder.generate(`
    button(Click me!)[type=button]@sayHello
`);
```

Note that you can add multiple event listeners to a single element by separating them with a semicolon:

```javascript
// ...
builder.generate(`
    button(Click me!)[type=button]@sayHello;andHoverMe
`);
```

Perfect, now you're good.

## Some details

You can add several attributes to a single element by separating them with a semicolon `;`. This symbol can be changed with the following method:

```javascript
builder.changeSymbolBetweenAttributes("/");
builder.generate(`
    button(Great button)[type=button / data-for=thing]
`);
```

Since 1.0.3, there is a brand new method (I needed it actually):

```javascript
builder.indentTemplate(`>button[type=button]`, 2);
// adds an indentation level of 2, so the result will be a button with an indentation level of 3
// `>>>button[type=button]`
// This method can be used with several lines: each line will be modified.
```

All of the other methods are private (they start with `_`). Ignore them.

## Technical part: the algorithm

How HTMLBuilder builds elements from a template? There are several steps:

- First, the program reads all the lines in order to identify the main HTML elements, i.e. those without indentation (so they don't start with a `>`). A list of lines is created.

- For each main element of our template, the program will read all the lines from the index of the main line to the index of the next main line in the list of lines. If there is not next main line, then the program will read all the lines to the end of the template. This process allows the algorithm to store all the children of each main element.

- We generate the HTML elements thanks that monster:

```javascript
/(\w+)((?:\.[\w-]*)*)*(#[\w-]*)?(?:\((.*)\))?(?:\[(.*)\])?(?:\@([\w;-]*))*/
```

- We now have a list of children for each main element. We save the indentation level of each child. The challenge here is to identify which element is the parent of which child. Therefore, we need to start with the deepest element and work our way up to the element closest to the parent.

* First, we need determine the last child to have the highest level of indentation: we call it the `deepest element`.

* Next, we need to identify its parent element, so we get the `nearest parent`. The deepest element has as parent the nearest element that has an identation level equal to "child's level - 1".

* Finally, as we read the list of children from bottom to top, we `prepend()` in order to keep the right order.

* At each iteration, a child is removed from the list of children because it is placed inside its parent until there are no more children.

Now we just `append()` each main element inside the given parent (by default: `document.body`).

I hope that was clear. Feel free to take a look at the code, everything is explained.

Enjoy!

## License

MIT License

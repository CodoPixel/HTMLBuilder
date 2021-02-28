// FRENCH="àèìòùÀÈÌÒÙáéíóúýÁÉÍÓÚÝâêîôûÂÊÎÔÛãñõÃÑÕäëïöüÿÄËÏÖÜŸçÇßØøÅåÆæœ"

/**
 * A tool that allows you to generate HTML content from a template in an optimised way.
 * @class
 */
class HTMLBuilder {
    /**
     * The regular expression used to parse a template.
     * @type {RegExp}
     * @constant
     * @private
     */
    private REGEX: RegExp = /(\w{1,})((?:\.[\w\d-]*){0,}){0,}(#[\w\d-]{0,}){0,}(?:\((.*)\)){0,1}(?:\[(.*)\]){0,1}/mi;
    
    /**
     * The parent element in which to put the generated elements from the template.
     * @type {HTMLElement}
     * @private
     */
    private parent: HTMLElement;

    /**
     * @constructs HTMLBuilder
     * @param {HTMLElement} parent The parent in which to put the generated elements.
     */
    public constructor(parent?: HTMLElement) {
        this.parent = parent || document.body;
    }

    /**
     * Gets the indentation level of a line. 
     * 
     * @param {string} line The line to parse.
     * @return {number} The level of indentation.
     * @private
     */
    private _level(line: string): number
    {
        var level = 0;
        for (var i = 0; i < line.length; i++) {
            if (line[i] !== ">") {
                break;
            } else {
                level++;
            }
        }
        return level;
    }

    /**
     * Extracts the different lines of a template in order to analyse them individually.
     * 
     * @param {string} template The template of the HTML elements.
     * @return {Array<string>} The lines from a template.
     * @private
     */
    private _extractLinesFrom(template: string): string[]
    {
        var lines = template.trim().split("\n");
        for (var i = 0; i < lines.length; i++) {
            lines[i] = lines[i].trim();
        }
        return lines;
    }

    /**
     * Generates a new HTML element from a line (you must use a specific syntax & order).
     * 
     * @param {string} line The line to parse.
     * @return {HTMLElement} The generated HTML element.
     * @private
     */
    private _createElementFromLine(line: string): HTMLElement 
    {
        // Be careful when you use exec() with the global flag
        // If you use a global flag, then set the lastIndex property of the regex to 0 (its initial value).
        // this.REGEX.lastIndex = 0;
        //
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec#finding_successive_matches
        var matches = this.REGEX.exec(line) || [];

        var tagname: string = matches[1] || null;
        var classes: string[] = matches[2] ? (matches[2].split(".") as string[]).filter(v => v !== "") : null;
        var id: string = matches[3] ? matches[3].replace("#", "") : null;
        var content: Text = matches[4] ? document.createTextNode(matches[4]) : null;
        var attributes: string[] = matches[5] ? (matches[2].split(",") as string[]).filter(v => v.trim()) : null;

        if (!tagname) {
            console.error('HTMLBuilder: unable to parse a line: "' + line + '"');
            return null;
        }

        var element: HTMLElement = document.createElement(tagname);
        if (classes) {
            for (var c of classes) {
                if (/\d/.test(c[0])) {
                    console.error("HTMLBuilder: invalid syntax for class name '" + c + "'");
                    continue;
                }
                element.classList.add(c);
            }
        }
        if (attributes) {
            for (var attr of attributes) {
                if (/\d/.test(attr[0])) {
                    console.error("HTMLBuilder: invalid syntax for attribute name '" + c + "'");
                    continue;
                }

                if (attr.indexOf('=') !== -1) {
                    var name: string = attr.split('=')[0];
                    var value: string = attr.split('=')[1];
                    element.setAttribute(name, value);
                } else {
                    element.setAttribute(attr, '');
                }
            }
        }

        if (id) element.id = id;
        if (content) element.appendChild(content);
        // TODO: to test => replace appendChild of a TextNode by textContent in order to parse html entities (&amp;)
        // TODO: https://stackoverflow.com/questions/5796718/html-entity-decode

        return element;
    }

    /**
     * Gets the maximum level of indentation.
     * 
     * @param {Array} children The list of children of a main element from a template.
     * @return {number} The maximum level of indentation of a list of children.
     * @private
     */
    private _maxLevel(children: [HTMLElement, number][]): number
    {
        var max: number = children[0][1];
        for (var child of children) {
            var level = child[1];
            if (level > max) {
                max = level;
            }
        }
        return max;
    }

    /**
     * Gets the index of the deepest element. The deepest element is the last child to have the bigger level of indentation.
     * 
     * @param {Array} children The list of children of a main element from a template.
     * @return {number} The index of the deepest child.
     * @private
     */
    private _getIndexOfDeepestElement(children: [HTMLElement, number][]): number
    {
        var max: number = this._maxLevel(children);
        if (max === 1) {
            // If all the elements are on the closest possible level (1),
            // then we want to append the last child of the list.
            // Remember that we do a prepend() not an append(),
            // therefore the last one must   go first in order to keep the right order
            return children.length - 1;
        }

        var lastIndex: number = 1;
        for (var i = 0; i < children.length; i++) {
            var level = children[i][1];
            if (level === max) {
                lastIndex = i;
            }
        }
        return lastIndex;
    }

    /**
     * Gets the index of the nearest element of the deepest one. This child is the parent element of the deepest one.
     * 
     * @param indexOfDeepest The index of the deepest element.
     * @param children The list of children of a main element from a template.
     * @return {number} The index of the nearest child.
     * @private
     */
    private _getIndexOfNearestParentElementOf(indexOfDeepest: number, children: [HTMLElement, number][]): number
    {
        var deepest: number = children[indexOfDeepest][1];
        var lastIndex: number = null;
        for (var i = 0; i < indexOfDeepest; i++) {
            var level: number = children[i][1];
            if (level === deepest - 1) {
                lastIndex = i;
            }
        }
        return lastIndex;
    }

    /**
     * Reproduces a template in full HTML structure and adds it to the parent as a child (there can be several parents).
     * 
     * @param {string} template The template of your HTML structure.
     * @public
     */
    public generate(template: string) {
        // We read all the lines in order to identify the main HTML elements,
        // i.e. those without indentation

        var lines: string[] = this._extractLinesFrom(template);
        var mainLines: string[] = [];
        var i = 0;
        var k = 0;

        for (i = 0; i < lines.length; i++) {
            var line = lines[i];
            var level = this._level(line);
            if (level === 0) {
                mainLines.push(line);
            }
        }

        // We read the next lines and we create an element that we save
        // in a list of children, for each main element.

        for (i = 0; i < mainLines.length; i++) {
            var childrenElements: [HTMLElement, number][] = [];
            var mainLine: string = mainLines[i];
            var mainElement: HTMLElement = this._createElementFromLine(mainLine);
            for (k = i + 1; k < lines.length; k++) {
                var line: string = lines[k];
                if (line === mainLine) {
                    break;
                } else {
                    var child: HTMLElement = this._createElementFromLine(line);
                    childrenElements.push([child, this._level(line)]);
                }
            }

            while (childrenElements.length > 0) {
                var indexOfDeepest: number = this._getIndexOfDeepestElement(childrenElements);
                var indexOfNearestParent: number = this._getIndexOfNearestParentElementOf(indexOfDeepest, childrenElements);

                // Don't forget to specify "!== null" because indexOfNearestParent can be 0 (= false)
                indexOfNearestParent !== null
                    ? childrenElements[indexOfNearestParent][0].prepend(childrenElements[indexOfDeepest][0])
                    : mainElement.prepend(childrenElements[indexOfDeepest][0]);

                childrenElements.splice(indexOfDeepest, 1);
            }

            this.parent.appendChild(mainElement);
        }
    }
}
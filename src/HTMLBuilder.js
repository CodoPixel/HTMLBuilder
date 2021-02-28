// FRENCH="àèìòùÀÈÌÒÙáéíóúýÁÉÍÓÚÝâêîôûÂÊÎÔÛãñõÃÑÕäëïöüÿÄËÏÖÜŸçÇßØøÅåÆæœ"
class HTMLBuilder {
    constructor(parent) {
        this.REGEX = /(\w{1,})((?:\.[\w\d-]*){0,}){0,}(#[\w\d-]{0,}){0,}(?:\((.*)\)){0,1}(?:\[(.*)\]){0,1}/mi;
        this.parent = parent || document.body;
    }
    _level(line) {
        var level = 0;
        for (var i = 0; i < line.length; i++) {
            if (line[i] !== ">") {
                break;
            }
            else {
                level++;
            }
        }
        return level;
    }
    _extractLinesFrom(template) {
        var lines = template.trim().split("\n");
        for (var i = 0; i < lines.length; i++) {
            lines[i] = lines[i].trim();
        }
        return lines;
    }
    _createElementFromLine(line) {
        // Be careful when you use exec() with the global flag
        // If you use a global flag, then set the lastIndex property of the regex to 0 (its initial value).
        // this.REGEX.lastIndex = 0;
        //
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec#finding_successive_matches
        var matches = this.REGEX.exec(line) || [];
        var tagname = matches[1] || null;
        var classes = matches[2] ? matches[2].split(".").filter(v => v !== "") : null;
        var id = matches[3] ? matches[3].replace("#", "") : null;
        var content = matches[4] ? document.createTextNode(matches[4]) : null;
        var attributes = matches[5] ? matches[2].split(",").filter(v => v.trim()) : null;
        if (!tagname) {
            console.error('HTMLBuilder: unable to parse a line: "' + line + '"');
            return null;
        }
        var element = document.createElement(tagname);
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
                    var name = attr.split('=')[0];
                    var value = attr.split('=')[1];
                    element.setAttribute(name, value);
                }
                else {
                    element.setAttribute(attr, '');
                }
            }
        }
        if (id)
            element.id = id;
        if (content)
            element.appendChild(content);
        return element;
    }
    _maxLevel(children) {
        var max = children[0][1];
        for (var child of children) {
            var level = child[1];
            if (level > max) {
                max = level;
            }
        }
        return max;
    }
    _getIndexOfDeepestElement(children) {
        var max = this._maxLevel(children);
        if (max === 1) {
            // If all the elements are on the closest possible level (1),
            // then we want to append the first child of the list, not the last one.
            return 0;
        }
        var lastIndex = 1;
        for (var i = 0; i < children.length; i++) {
            var level = children[i][1];
            if (level === max) {
                lastIndex = i;
            }
        }
        return lastIndex;
    }
    _getIndexOfNearestParentElementOf(indexOfDeepest, children) {
        var deepest = children[indexOfDeepest][1];
        var lastIndex = null;
        for (var i = 0; i < indexOfDeepest; i++) {
            var level = children[i][1];
            if (level === deepest - 1) {
                lastIndex = i;
            }
        }
        return lastIndex;
    }
    generate(template) {
        // We read all the lines in order to identify the main HTML elements,
        // i.e. those without indentation
        var lines = this._extractLinesFrom(template);
        var mainLines = [];
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
            var childrenElements = [];
            var mainLine = mainLines[i];
            var mainElement = this._createElementFromLine(mainLine);
            for (k = i + 1; k < lines.length; k++) {
                var line = lines[k];
                if (line === mainLine) {
                    break;
                }
                else {
                    var child = this._createElementFromLine(line);
                    childrenElements.push([child, this._level(line)]);
                }
            }
            while (childrenElements.length > 0) {
                var indexOfDeepest = this._getIndexOfDeepestElement(childrenElements);
                var indexOfNearestParent = this._getIndexOfNearestParentElementOf(indexOfDeepest, childrenElements);
                indexOfNearestParent
                    ? childrenElements[indexOfNearestParent][0].appendChild(childrenElements[indexOfDeepest][0])
                    : mainElement.appendChild(childrenElements[indexOfDeepest][0]);
                childrenElements.splice(indexOfDeepest, 1);
            }
            this.parent.appendChild(mainElement);
        }
    }
}

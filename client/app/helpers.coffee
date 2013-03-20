# Base class generated by Brunch
class exports.BrunchApplication
    constructor: ->
        $ =>
            @initialize this
            Backbone.history.start()

    # Initialize Spin JS the lib that displays loading indicators
    initializeJQueryExtensions: ->
        $.fn.spin = (opts, color) ->
            presets =
                tiny:
                    lines: 8
                    length: 2
                    width: 2
                    radius: 3

                small:
                    lines: 8
                    length: 1
                    width: 2
                    radius: 5

                large:
                    lines: 10
                    length: 8
                    width: 4
                    radius: 8

            if Spinner
                @each ->
                    $this = $(this)
                    spinner = $this.data("spinner")
                    if spinner?
                        spinner.stop()
                        $this.data "spinner", null
                    else if opts isnt false
                        if typeof opts is "string"
                            if opts of presets
                                opts = presets[opts]
                            else
                                opts = {}
                            opts.color = color    if color
                        spinner = new Spinner(
                            $.extend(color: $this.css("color"), opts))
                        spinner.spin(this)
                        $this.data "spinner", spinner

            else
                console.log "Spinner class not available."
                null

    initialize: ->
        null


# Select all content of an input field.
exports.selectAll = (input) ->
    input.setSelection 0, input.val().length


# Change a string into its slug shape (only alphanumeric char and hyphens
# instead of spaces).
exports.slugify = require "./lib/slug"


# Transform a todolist path into its regular expression shape.
exports.getPathRegExp = (path) ->
    slashReg = new RegExp "/", "g"
    "^#{path.replace(slashReg, "\/")}"

# Extract tags from a string a tag is a word with an # at the beginning.
# t is converted to today, w to week, and m to month
exports.extractTags = (description) ->
    hashTags =  description.match(/#(\w)*/g)
    tags = []
        
    if hashTags?
        for tag in hashTags
            tag = "#today" if tag is "#t"
            tag = "#week" if tag is "#w"
            tag = "#month" if tag is "#m"
            tags.push tag.substring(1)

    tags

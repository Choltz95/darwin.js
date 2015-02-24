var StringEvolver = {

    createWordFitnessFunction: function(targetWord) {
        return function fitnessFunc(actualWord) {
            var total = 0;
            var actualWordLength = actualWord.length;
            for (var i = 0; i < actualWordLength; i++) {
                if (actualWord.charAt(i) == targetWord.charAt(i)) {
                    total++;
                }
            }
            return total;
        }
    },

    createRandomStringGenerator: function(charPool, wordLength) {
        return function generateRandomString() {
            var str = "";
            for (var i = 0; i < wordLength; i++) {
                var randChar = _.random(0, charPool.length - 1);
                str += charPool.charAt(randChar);
            }
            return str
        }
    },

    randomCharacterMutation: function(individual) {
        var newString = "";
        var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ "; // fix this
        for (var i = 0; i < individual.length; i++) {
            if (Math.random() < 0.01) {
                var randChar = _.random(0, alphabet.length - 1);
                newString += alphabet.charAt(randChar);
            } else {
                newString += individual.charAt(i);
            }
        }
        return newString;
    },

    createStringDiffView: function(target) {
        return Backbone.View.extend({
            tagName: "p",
            colors: {
                match: "rgb(141, 199, 63)",
                mismatch: "rgb(237, 28, 36)"
            },
            initialize: function(options) { // Change options in the other views!
                this.actual = options.actual;
                this.target = target;
            },
            render: function() {
                for (var i = 0; i < this.target.length; i++) {
                    var type = this.target.charAt(i) === this.actual.charAt(i) ? "match" : "mismatch";
                    this.$el.append('<span style="color: ' + this.colors[type] + ';">' + this.actual.charAt(i) + '</span>');
                }
                return this;
            }
        });
    }

};

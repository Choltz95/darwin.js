Darwin.vent = _.extend({}, Backbone.Events);

var DashboardView = Backbone.View.extend({

    tagName: "div",

    className: "dashboard",

    initialize: function(ga) {
        this.ga = ga;
        this.initSubviews();
        this.registerCallbacks();
    },

    initSubviews: function() {
        this.GenerationsCollection = Backbone.Collection.extend();
        this.generationsCollection = new this.GenerationsCollection();
        this.generationsView = new GenerationsView({ collection: this.generationsCollection });
        this.generationDetailsView = new GenerationDetailsView();
        this.candidateDetailsView = new CandidateDetailsView();
    },

    registerCallbacks: function() {
        var gensMap = {};

        this.listenTo(this.ga, "ga-started", function() {
        });

        this.listenTo(this.ga, "generation-started", function(generation) {
            this.generationsCollection.add(generation);
            var last = this.generationsCollection.last();
            gensMap[last.get("generation")] = last;
        });

        this.listenTo(this.ga, "generation-finished", function(generation) {
            var generationModel = gensMap[generation.generation];
            generationModel.set(generation);
            this.generationDetailsView.model = generationModel;
            this.generationDetailsView.render();
        });
    },

    render: function() {
        this.$el.html();
        this.$el.append(this.generationsView.render().el);
        this.$el.append(this.generationDetailsView.render().el);
        //var candidateDetailsView = new CandidateDetailsView();
        //this.$el.append(candidateDetailsView.render().el);
        return this;
    }
});

var GenerationsView = Backbone.View.extend({

    className: "generations-container",

    initialize: function() {
        this.generationsTableView = new GenerationsTableView({ collection: this.collection });
    },

    render: function() {
        this.$el.html("<p>Something</p>");
        this.$el.append(this.generationsTableView.render().el);
        return this;
    }

});

var GenerationsTableView = Backbone.View.extend({

    tagName: "table",

    className: "generations",

    template: _.template($("#generations-table-view").html()),

    initialize: function() {
        this.selectedGenerationRowView = null;
        this.generationRowViews = [];
        this.listenTo(Darwin.vent, "generation-selected", this.selectGeneration);
        if (this.collection) {
            this.listenTo(this.collection, "add", this.addGeneration);
        }
    },

    addGeneration: function(generation) {
        this.generationRowView = new GenerationRowView({ model: generation });
        this.generationRowViews.push(this.generationRowView);
        this.$("tbody").append(this.generationRowView.render().el);
        this.selectGeneration(generation);
        this.$("tbody").scrollTop(100000);
    },

    render: function() {
        this.$el.html(this.template());
        return this;
    },

    selectGeneration: function(generation) {
        if (this.selectedGenerationRowView) {
            if (this.selectedGenerationRowView.model.get("number") === generation.get("number")) {
                return;
            }
            this.selectedGenerationRowView.unselect();
        }
        this.selectedGenerationRowView = this.generationRowViews[generation.get("number")];
        this.selectedGenerationRowView.select();
    }

});

var GenerationRowView = Backbone.View.extend({

    tagName: "tr",

    templates: {
        "complete": _.template($("#generation-row-view").html()),
        "in-progress": _.template($("#generation-row-view-in-progress").html())
    },

    events: {
        "click": "selectClick"
    },

    initialize: function() {
        this.listenTo(this.model, "change", this.render);
    },

    render: function() {
        var templateName = this.model.get("status");
        this.$el.html(this.templates[templateName](this.model.toJSON()));
        return this;
    },

    selectClick: function() {
        Darwin.vent.trigger("generation-selected", this.model);
    },

    select: function() {
        this.$el.css('background-color', '#91C2CE'); // TODO move this color to a class
    },

    unselect: function() {
        this.$el.css('background-color', '');
    }

});

var GenerationDetailsView = Backbone.View.extend({

    tagName: "div",

    className: "generation-details",

    template: {
        "full": _.template($("#generation-details-view").html()),
        "empty": _.template($("#generation-details-view-empty").html())
    },

    initialize: function() {
        this.listenTo(Darwin.vent, "generation-selected", this.generationSelected);
    },

    generationSelected: function(generation) {
        this.model = generation;
        this.render();
    },

    // TODO listener if the model changes? how to do that?

    render: function() {
        this.$el.html();
        if (this.model) {
            // TODO what if there is no model
            this.$el.html(this.template["full"](this.model.toJSON()));
            var backCollection = new Backbone.Collection(this.model.get("population"));
            var populationTableView = new PopulationTableView({ collection: backCollection });
            this.$el.append(populationTableView.render().el);
        } else {
            this.$el.html(this.template["empty"]());
        }
        return this;
    }

});

var PopulationTableView = Backbone.View.extend({

    tagName: "table",

    className: "population",

    template: _.template($("#population-table-view").html()),

    initialize: function() {
        this.selectedCandidateRowView = null;
        this.candidateRowViews = [];
        this.listenTo(Darwin.vent, "candidate-selected", this.selectCandidate);
    },

    render: function() {
        this.$el.html(this.template());
        for (var i = 0; i < 30; i++) {
            var candidate = this.collection.get(i);
            var candidateRowView = new CandidateRowView({ model: candidate });
            this.candidateRowViews.push(candidateRowView);
            if (i == 0) {
                this.selectCandidate(candidate);
            }
            this.$el.append(candidateRowView.render().el);
        }
        return this;
    },

    selectCandidate: function(candidate) {
        if (this.selectedCandidateRowView) {
            this.selectedCandidateRowView.unselect();
        }
        this.selectedCandidateRowView = this.candidateRowViews[candidate.get("id")];
        this.selectedCandidateRowView.select();
    }

});

var CandidateRowView = Backbone.View.extend({

    tagName: "tr",

    template: _.template($("#candidate-row-view").html()),

    events: {
        "click": "selectClick"
    },

    render: function() {
        var candidateLabelView = new CandidateLabelView({
            actual: this.model.get("candidate"),
            target: "EVOLVING HELLO WORLD!"
        });
        this.$el.html(this.template({
            id: this.model.get("id"),
            candidate: candidateLabelView.render().el.innerHTML,
            fitness: this.model.get("fitness")
        }));
        return this;
    },

    selectClick: function() {
        Darwin.vent.trigger("candidate-selected", this.model);
    },

    select: function() {
        this.$el.css('background-color', '#91C2CE');
    },

    unselect: function() {
        this.$el.css('background-color', '');
    }

});

var CandidateDetailsView = Backbone.View.extend({

    tagName: "div",

    className: "candidate-details",

    template: _.template($("#candidate-details-view").html()),

    initialize: function() {
        this.candidate = null;
        //this.listenTo(Darwin.vent, "candidate-selected", this.changeCandidate);
    },

    render: function() {
        this.$el.html("Candidate Details");
        return this;
    },

    changeCandidate: function(candidate) {
        this.render();
    }

});

var CandidateLabelView = Backbone.View.extend({

    tagName: "p",

    initialize: function(opts) { // Change options in the other views!
        this.actual = opts.actual;
        this.target = opts.target;
    },

    render: function() {
        for (var i = 0; i < this.target.length; i++) {
            if (this.target.charAt(i) === this.actual.charAt(i)) {
                this.$el.append('<span style="color: #ff0000;">' + this.actual.charAt(i) + '</span>');
            } else {
                this.$el.append("<span>" + this.actual.charAt(i) + "</span>");
            }
        }
        return this;
    }

});

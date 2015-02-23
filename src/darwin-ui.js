Darwin.vent = _.extend({}, Backbone.Events);

var EAConfigurationView = Backbone.View.extend({

    className: "widget widget-info",

    template: _.template($("#ea-configuration-view").html()),

    events: {
        "click .start": "start",
        "click .reset": "reset"
    },

    initialize: function(ga) {
        this.ga = ga;
    },

    render: function() {
        this.$el.html(this.template());
        return this;
    },

    start: function() {
        this.run();
        this.ga.populationSize = parseInt(this.$(".population-size").val());
        this.ga.start();
    },

    run: function() {
        this.$(".population-size").prop("disabled", true);
        this.$(".start").prop("disabled", true);
        this.$(".reset").prop("disabled", false);
    },

    reset: function() {
        this.$(".population-size").prop("disabled", false);
        this.$(".start").prop("disabled", false);
        this.$(".reset").prop("disabled", true);
        this.ga.reset();
    }

});

var DashboardView = Backbone.View.extend({

    className: "dashboard",

    initialize: function(ga) {
        this.ga = ga;
        this.initSubviews();
        this.registerCallbacks();
    },

    initSubviews: function() {
        this.GenerationsCollection = Backbone.Collection.extend();
        this.generationsCollection = new this.GenerationsCollection();
        this.generationsTableView = new GenerationsTableView({ collection: this.generationsCollection });
        this.generationDetailsView = new GenerationDetailsView();
        this.candidateDetailsView = new CandidateDetailsView();
        this.configurationView = new EAConfigurationView(this.ga);
    },

    registerCallbacks: function() {
        var gensMap = {};

        this.listenTo(this.ga, "reset", function() {
            gensMap = {};
            this.initSubviews();
            this.render();
        });

        this.listenTo(this.ga, "ea-started", function() {
        });

        this.listenTo(this.ga, "generation-started", function(generation) {
            this.generationsCollection.add(generation);
            var last = this.generationsCollection.last();
            gensMap[last.get("id")] = last;
        });

        this.listenTo(this.ga, "generation-finished", function(generation) {
            var generationModel = gensMap[generation.id];
            generationModel.set(generation);
            this.generationDetailsView.model = generationModel;
            this.generationDetailsView.render();
        });
    },

    render: function() {
        this.$el.empty();
        this.$el.append(this.configurationView.render().el);
        this.$el.append(this.generationsTableView.render().el);
        this.$el.append(this.generationDetailsView.render().el);
        this.$el.append(this.candidateDetailsView.render().el);
        return this;
    }

});

var GenerationsTableView = Backbone.View.extend({

    tagName: "table",

    className: "ea generations widget",

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
        this.generationRowView = new GenerationRowView({
            model: generation
        });
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
            if (this.selectedGenerationRowView.model.get("id") === generation.get("id")) {
                return;
            }
            this.selectedGenerationRowView.unselect();
        }
        this.selectedGenerationRowView = this.generationRowViews[generation.get("id")];
        this.selectedGenerationRowView.select();
    }

});

var SelectableRowView = Backbone.View.extend({

    tagName: "tr",

    events: {
        "click": "customSelect"
    },

    select: function() {
        this.$el.addClass("selected");
    },

    unselect: function() {
        this.$el.removeClass("selected");
    }

});

var GenerationRowView = SelectableRowView.extend({

    templates: {
        "complete": _.template($("#generation-row-view").html()),
        "in-progress": _.template($("#generation-row-view-in-progress").html())
    },

    initialize: function() {
        this.listenTo(this.model, "change", this.render);
    },

    // TODO Refactor
    render: function() {
        var templateName = this.model.get("status");
        if (templateName === "complete") {
            var candidateLabelView = new CandidateLabelView({
                actual: this.model.get("bestCandidate"),
                target: "EVOLUTION" // TODO Move to model configuration
            });
            this.$el.html(this.templates[templateName]({
                id: this.model.get("id"),
                bestCandidate: candidateLabelView.render().el.innerHTML,
                bestCandidateFitness: this.model.get("bestCandidateFitness"),
                averageFitness: this.model.get("averageFitness") // TODO rename to avgFitness
            }));
        } else {
            this.$el.html(this.templates[templateName](this.model.toJSON()));
        }
        return this;
    },

    customSelect: function() {
        Darwin.vent.trigger("generation-selected", this.model);
    }

});

var GenerationDetailsView = Backbone.View.extend({

    template: {
        "full": _.template($("#generation-details-view").html()),
        "empty": _.template($("#generation-details-view-empty").html())
    },

    initialize: function() {
        this.populationTableView = null;
        this.listenTo(Darwin.vent, "generation-selected", this.generationSelected);
    },

    generationSelected: function(generation) {
        this.model = generation;
        this.render();
    },

    // TODO listener if the model changes? how to do that?

    render: function() {
        if (this.model) {
            //this.$el.html(this.template["full"](this.model.toJSON()));
            this.$el.html();
            if (this.populationTableView) {
                this.populationTableView.remove();
            }
            this.populationTableView = new PopulationTableView({
                collection: new Backbone.Collection(this.model.get("population"))
            });
            this.$el.append(this.populationTableView.render().el);
        } else {
            this.$el.html(this.template["empty"]());
        }
        return this;
    }

});

var PopulationTableView = Backbone.View.extend({

    tagName: "table",

    className: "ea population widget",

    template: _.template($("#population-table-view").html()),

    initialize: function() {
        this.selectedCandidateRowView = null;
        this.candidateRowViews = [];
        this.listenTo(Darwin.vent, "candidate-selected", this.selectCandidate);
    },

    render: function() {
        this.$el.html(this.template());
        for (var i = 0; i <this.collection.length; i++) {
            var candidate = this.collection.get(i);
            var candidateRowView = new CandidateRowView({ model: candidate });
            this.candidateRowViews.push(candidateRowView);
            if (i == 0) {
                candidateRowView.customSelect();
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

var CandidateRowView = SelectableRowView.extend({

    template: _.template($("#candidate-row-view").html()),

    render: function() {
        var candidateLabelView = new CandidateLabelView({
            actual: this.model.get("candidate"),
            target: "EVOLUTION"
        });
        this.$el.html(this.template({
            id: this.model.get("id"),
            candidate: candidateLabelView.render().el.innerHTML,
            fitness: this.model.get("fitness")
        }));
        return this;
    },

    customSelect: function() {
        Darwin.vent.trigger("candidate-selected", this.model);
    }

});

var CandidateDetailsView = Backbone.View.extend({

    className: "widget widget-info candidate-details-view",

    template: {
        "full": _.template($("#candidate-details-view").html()),
        "empty": _.template($("#candidate-details-view-empty").html())
    },

    initialize: function() {
        this.listenTo(Darwin.vent, "candidate-selected", this.changeCandidate);
    },

    render: function() {
        if (this.model) {
            this.$el.html(this.template["full"](this.model.toJSON()));
        } else {
            this.$el.html(this.template["empty"]());
        }
        return this;
    },

    changeCandidate: function(candidate) {
        this.model = candidate;
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
                this.$el.append('<span style="color: rgb(141, 199, 63);">' + this.actual.charAt(i) + '</span>');
            } else {
                this.$el.append('<span style="color: rgb(237, 28, 36);">' + this.actual.charAt(i) + "</span>");
            }
        }
        return this;
    }

});

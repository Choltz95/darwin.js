var Darwin = Darwin || {};

(function() {
    "use strict";

    Darwin.GA = function(options) {
        this.options = options || {};
        this.populationSize = options.populationSize; // TODO even population size?
        this.fitnessFunction = options.fitnessFunction;
        this.genIndFunc = options.genIndFunc;
        this.generations = [];
        this.observers = options.observers;
        this.reproduce = options.reproduce;
        this.mutate = options.mutate;
        this.terminationConditions = options.terminationConditions;
        this.notifCallbacks = {};
        this.currentGeneration = null;
        this.registerCallbacks(options.notificationCallbacks);
    };

    Darwin.GA.prototype = {

        registerCallbacks: function(notifCallbacks) {
            Object.keys(notifCallbacks).forEach(function(key) {
                this.notifCallbacks[key] = this.notifCallbacks[key] || new Darwin.Utils.Callbacks();
                if (typeof notifCallbacks[key] === "function") {
                    this.notifCallbacks[key].add(notifCallbacks[key]);
                }
            }, this);
        },

        newPopulations: function() {
            var newPopulation = [];
            var halfLength = this.population.length / 2; // verify population size % 2 == 0?
            for (var i = 0; i < halfLength; i++) {
                var parentA = Darwin.Selection.randomTopPercent(this.evaluatedPopulation);
                var parentB = Darwin.Selection.randomTopPercent(this.evaluatedPopulation);
                var children = this.reproduce(parentA.candidate, parentB.candidate); // remove .candidate
                var childA = this.mutate(children.childA);
                var childB = this.mutate(children.childB);
                newPopulation.push(childA);
                newPopulation.push(childB);
            }
            return newPopulation;
        },

        computeStats: function() {
            var totalFitness = this.evaluatedPopulation.map(function(candidate) {
                                                  return candidate.fitness;
                                              })
                                              .reduce(function(prev, cur) {
                                                  return prev + cur;
                                              });
            var average = totalFitness / this.evaluatedPopulation.length;

            // TODO extend object with _.extend
            this.currentGeneration.averageFitness = average;
            this.currentGeneration.bestCandidate = this.evaluatedPopulation[0].candidate;
            this.currentGeneration.bestCandidateFitness = this.evaluatedPopulation[0].fitness;
            this.currentGeneration.population = this.evaluatedPopulation; // sorted from best to worst?
            this.currentGeneration.status = "complete";
            this.generations.push(this.currentGeneration);
        },

        evolutionaryStep: function() {
            // check if termination conditions are reached?
            this.currentGeneration = { generation: this.generations.length, status: "in-progress" };  // TODO merge
            this.fire("generation-started");
            this.evaluatedPopulation = Darwin.Utils.evaluatePopulation(this.population, this.fitnessFunction); // TODO merge
            this.fire("population-evaluated");
            this.evaluatedPopulation.sort(function(a, b) {
                return b.fitness - a.fitness;
            });
            this.fire("population-sorted");
            this.computeStats();
            this.fire("generation-finished");
            if (Darwin.Utils.shouldContinue(this.generations[this.generations.length - 1], this.terminationConditions)) {
                this.population = this.newPopulations(); // TODO merge
                this.fire("population-generated");
            } else {
                this.fire("ga-finished");
                clearInterval(this.interval);
            }
        },

        fire: function(notification) {
            var observersLength = this.observers.length;
            for (var i = 0; i < observersLength; i++) {
                this.observers[i](this, notification);
            }
        },

        //fire: function(notification) {
        //    var callbacks = this.notifCallbacks[notification];
        //    callbacks.list.forEach(function(callback) {
        //        callback.call(this);
        //    });
        //},

        reset: function() {
            this.population = [];
            this.evaluatedPopulation = [];
        },

        run: function() {
            this.fire("ga-started");
            this.population = Darwin.Utils.generatePopulation(this.genIndFunc, this.populationSize);
            this.fire("population-generated");
            this.interval = setInterval(jQuery.proxy(this, "evolutionaryStep"), 50);
        }
    };
})();

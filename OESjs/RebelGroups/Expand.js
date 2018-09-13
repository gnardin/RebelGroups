/*******************************************************************************
 * Expand event class
 *
 * @copyright Copyright 2018 Brandenburg University of Technology, Germany
 * @license The MIT License (MIT)
 * @author Frances Duffy
 * @author Kamil Klosek
 * @author Luis Gustavo Nardin
 * @author Gerd Wagner
 ******************************************************************************/
var Expand = new cLASS( {
  Name: "Expand",
  supertypeName: "eVENT",
  properties: {
    "rebelGroup": {
      range: "RebelGroup"
    }
  },
  methods: {
    "onEvent": function () {
      /**
       * First, Rebel Groups decides whether they want to expand.
       * If so, they decide the method of expansion: fight, extortion or loot.
       *
       * The decision to fight uses a sigmoid function based on time and
       * power ratio
       */
      var followupEvents = [];
      var globalStrengthRatio, strengthRatio, expandProb, fightProb;
      var enterprise, wEnterprises, threshold, i, v;
      var enterprisesObj = cLASS[ "Enterprise" ].instances;
      var enterprisesKey = Object.keys( enterprisesObj );

      /* CHECK Expand Probability */
      globalStrengthRatio =
        sim.model.f.globalRelativeStrength( this.rebelGroup );

      expandProb = sim.model.f.sigmoid( 1, 1, 10,
        sim.model.f.normalizeValue( globalStrengthRatio ),
        ( this.occTime - this.rebelGroup.lastExpand ) );

      /*
       * Decide to expand if there are Enterprises to expand and the Rebel
       * Group has rebels
       */
      if ( ( rand.uniform() < expandProb ) &&
        ( this.rebelGroup.nmrOfRebels > 0 ) &&
        ( enterprisesKey.length >
          this.rebelGroup.extortedEnterprises.length ) ) {

        // Select the poorest Enterprise with greater probability
        wEnterprises = [];
        wEnterprises[ 0 ] = enterprisesObj[ enterprisesKey[ 0 ] ].wealth;
        for ( i = 1; i < enterprisesKey.length; i += 1 ) {
          wEnterprises[ i ] = wEnterprises[ i - 1 ] +
            enterprisesObj[ enterprisesKey[ i ] ].wealth;
        }
        threshold = rand.uniform( 0, 1 );
        for ( i = 0, v = 0; v < threshold; i += 1 ) {
          v = 1 - ( wEnterprises[ i ] /
            wEnterprises[ wEnterprises.length - 1 ] );
        }
        enterprise = enterprisesObj[ enterprisesKey[ i ] ];
        if ( ( enterprise.rebelGroup !== null ) &&
          ( this.rebelGroup.id === enterprise.rebelGroup.id ) ) {
          do {
            enterprise = enterprisesObj[ enterprisesKey[
              rand.uniformInt( 0, enterprisesKey.length - 1 ) ] ];
          } while ( ( enterprise.rebelGroup !== null ) &&
            ( this.rebelGroup.id === enterprise.rebelGroup.id ) );
        }

        /* Calculate the probability to fight if the Enterprise already has
         * an main extorter Rebel Group
         */
        fightProb = 0;
        if ( enterprise.rebelGroup !== null ) {
          strengthRatio = sim.model.f.normalizeValue(
            sim.model.f.relativeStrength( this.rebelGroup,
              enterprise.rebelGroup ) );

          /* CHECK Fight Probability */
          fightProb = sim.model.f.sigmoid( 1, 1, 1,
            -1.5, ( strengthRatio * 5 ) - 2 );
        } else {
          enterprise.rebelGroup = this.rebelGroup;
        }

        if ( rand.uniform() < fightProb ) {
          followupEvents.push( new Fight( {
            occTime: this.occTime + 1,
            defiant: this.rebelGroup,
            opponent: enterprise.rebelGroup
          } ) );
        } else {
          /*
           * Weaker Rebel Groups have a greater chance to loot, while
           * stronger Rebel Groups tend to extort
           */
          if ( rand.uniform() < globalStrengthRatio ) {
            followupEvents.push( new Extort( {
              occTime: this.occTime + 1,
              rebelGroup: this.rebelGroup,
              enterprise: enterprise
            } ) );
          } else {
            followupEvents.push( new Loot( {
              occTime: this.occTime + 1,
              rebelGroup: this.rebelGroup,
              enterprise: enterprise
            } ) );
          }
        }
        this.rebelGroup.lastExpand = this.occTime;

        sim.stat.nmrOfExpands += 1;
      }
      return followupEvents;
    }
  }
} );
Expand.recurrence = function ( e ) {
  return e.rebelGroup.freqExpand;
};
Expand.createNextEvent = function ( e ) {
  return new Expand( {
    occTime: e.occTime + Expand.recurrence( e ),
    rebelGroup: e.rebelGroup
  } );
};
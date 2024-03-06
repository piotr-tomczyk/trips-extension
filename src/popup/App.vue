<template>
    <div class="popup-body">
        <div class="form-container">
            <span> Airline: </span>
            <select v-model="selectedAirline">
                <option v-for="airline in airlinesOptions" :key="airline" :value="airline">
                    {{ airline }}
                </option>
            </select>
            <span> Aircraft: </span>
            <select v-model="selectedAircraft">
                <option
                    v-if="aircrafts.length"
                    :value="null">
                </option>
                <option v-for="aircraft in aircrafts" :key="aircraft" :value="aircraft">
                    {{ aircraft }}
                </option>
            </select>
            <span> Departure: </span>
            <select v-model="selectedDeparture">
                <option
                    v-if="departureAirports.length"
                    :value="null">
                </option>
                <option v-for="airport in departureAirports" :key="airport.id" :value="airport">
                    {{ airport.name }}
                </option>
            </select>
            <span> Destination: </span>
            <select
                v-model="selectedDestination">
                <option
                    v-if="departureAirports.length"
                    :value="null">
                </option>
                <option v-for="airport in departureAirports" :key="airport.id" :value="airport">
                    {{ airport.name }}
                </option>
            </select>
            <span> Leg number: </span>
            <select
                v-model="legNumber">
                <option v-for="leg in legCountOptions" :key="leg" :value="leg">
                    {{ leg }}
                </option>
            </select>
            <span> Hour Limit per leg: </span>
            <select
                v-model="hoursLimit">
                <option v-for="hour in hoursLimitOptions" :key="hour" :value="hour">
                    {{ hour }}
                </option>
            </select>
        </div>
        <button
            :disabled="isGeneratingRoute"
            @click="calculateLegs">
            Search
        </button>

        <p v-if="isGeneratingRoute">
            Generating Route...
        </p>

        <p v-if="foundTrip">
            Found Trip -
            Aircraft: {{ generatedAircraftType }}, Route:
            <div v-for="leg in foundTrip.legs" :key="leg.start">
                <p>{{ leg.start }} -> {{ leg.end }}</p>
            </div>
        </p>
    </div>
</template>

<script setup lang="ts">
    import { ref, computed } from 'vue';


    import spiritData from '../static/spirit.json';
    import aalData from '../static/aal.json';
    import ualData from '../static/ual.json';

    import type { Trip, Route } from '../types/types';
    import { airlines } from '../types/types';
    import { TripService } from '../services/trip-service';

    const aircrafts = computed(() => {
        switch(selectedAirline.value) {
            case airlines.SPIRIT:
                return spiritData.aircrafts;
            case airlines.AMERICAN:
                return aalData.aircrafts;
            case airlines.UNITED:
                return ualData.aircrafts;
            default:
                return [];
        }
    });
    const routes = computed(() => {
        switch(selectedAirline.value) {
            case airlines.SPIRIT:
                return spiritData.routes;
            case airlines.AMERICAN:
                return aalData.routes;
            case airlines.UNITED:
                return ualData.routes;
            default:
                return [];
        }
    });
    const departureAirports = computed(() => {
        return routes.value.filter(route => selectedAircraft.value ? route.aircrafts.includes(selectedAircraft.value) : true);
    });

    const selectedDeparture = ref<Route | null>(null);
    const selectedDestination = ref<Route | null>(null);

    const selectedAircraft = ref(null);

    const legCountOptions = ref([2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const legNumber = ref(2);

    const hoursLimit = ref(0);
    const hoursLimitOptions = ref([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    const searchModes = ref(['Legs', 'Trips']);
    const selectedSearchMode = ref('Trips');

    const selectedAirline = ref(airlines.SPIRIT);
    const airlinesOptions = ref([airlines.SPIRIT, airlines.UNITED, airlines.AMERICAN]);

    const foundTrip = ref<Trip | null>(null);
    const generatedAircraftType = ref<string | null>(null);

    const isGeneratingRoute = ref(false);

    function calculateLegs() {
        if (isGeneratingRoute.value) {
            return;
        }
        if (!selectedDeparture.value || !selectedSearchMode.value) {
            return null;
        }

        switch (selectedSearchMode.value) {
            case 'Legs':
                console.log('Legs');
                break;
            case 'Trips':
                const startAirport = selectedDeparture.value.icao;
                const destinationAirport = selectedDestination.value?.icao;
                const desiredHours = hoursLimit.value;
                const desiredLegs = legNumber.value;

                isGeneratingRoute.value = true;
                const tripService = new TripService();
                const tripsData = tripService.findTrips(
                    // @ts-ignore
                    routes.value,
                    startAirport,
                    destinationAirport || startAirport,
                    desiredLegs + 1,
                    selectedAircraft.value || undefined,
                    desiredHours
                );
                foundTrip.value = tripsData.trips[(Math.floor(Math.random() * tripsData.trips.length))];
                generatedAircraftType.value = tripsData.aircraftType;
                isGeneratingRoute.value = false;
                break;
            default:
                console.log('Default');
        }
    }
</script>

<style scoped>
    .popup-body {
        width: 400px;
        max-height: 600px;
        margin: 10px;
    }

    .form-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
</style>

<template>
    <div class="popup-body">
        <p>Popup</p>
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
        <button @click="calculateLegs">
            Search
        </button>
        <p>Selected Airline: {{ selectedAirline }}</p>
        <p>Selected Aircraft: {{ selectedAircraft }}</p>
        <p>Selected Departure: {{ selectedDeparture?.name }}</p>
        <p>Selected Destination: {{ selectedDestination?.name }}</p>
        <p>Leg Number: {{ legNumber }}</p>
        <p>Selected Search Mode: {{ selectedSearchMode }}</p>
        <p>Hours Limit: {{ hoursLimit }}</p>
        <p>
            Found Trip:
            <div v-if="foundTrip">
                <div v-for="leg in foundTrip.legs" :key="leg.start">
                    <p>{{ leg.start }} -> {{ leg.end }}</p>
                </div>
            </div>
        </p>
    </div>
</template>

<script setup lang="ts">
    import { ref, computed } from 'vue';


    import spiritData from '../static/spirit.json';
    import aalData from '../static/aal.json';
    import ualData from '../static/ual.json';

    import type { Trip, Route } from '../types/Route';
    import { TripService } from '../services/trip-service';

    const aircrafts = computed(() => {
        switch(selectedAirline.value) {
            case 'vSpirit':
                return spiritData.aircrafts;
            case 'vAAL':
                return aalData.aircrafts;
            case 'vUAL':
                return ualData.aircrafts;
            default:
                return [];
        }
    });
    const routes = computed(() => {
        switch(selectedAirline.value) {
            case 'vSpirit':
                return spiritData.routes;
            case 'vAAL':
                return aalData.routes;
            case 'vUAL':
                return ualData.routes;
            default:
                return [];
        }
    });

    const selectedAircraft = ref(null);
    const selectedDeparture = ref<Route | null>(null);
    const selectedDestination = ref<Route | null>(null);
    const legCountOptions = ref([2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const legNumber = ref(2);
    const hoursLimit = ref(0);
    const hoursLimitOptions = ref([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const searchModes = ref(['Legs', 'Trips']);
    const selectedSearchMode = ref('Trips');
    const selectedAirline = ref('vSpirit');
    const airlinesOptions = ref(['vSpirit', 'vUAL', 'vAAL']);
    const foundTrip = ref<Trip | null>(null);
    const departureAirports = computed(() => {
        return routes.value.filter(route => selectedAircraft.value ? route.aircrafts.includes(selectedAircraft.value) : true);
    });

    function calculateLegs() {
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

                const tripService = new TripService();
                const trips: Trip[] = tripService.findTrips(
                    // @ts-ignore
                    routes.value,
                    startAirport,
                    destinationAirport || startAirport,
                    desiredLegs + 1,
                    selectedAircraft.value || undefined,
                    desiredHours
                );
                foundTrip.value = trips[(Math.floor(Math.random() * trips.length))];
                break;
            default:
                console.log('Default');
        }
    }
</script>

<style scoped>
    .popup-body {
        width: 400px;
        height: 400px;
        margin: 10px;
    }

    .form-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
</style>

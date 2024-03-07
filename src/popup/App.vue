<template>
    <div class="popup-body">
        <div class="form-container">
            <span> VA: </span>
            <select v-model="selectedAirline">
                <option v-for="airline in airlinesOptions" :key="airline" :value="airline">
                    {{ airline }}
                </option>
            </select>
            <span> Airline: </span>
            <select v-model="selectedCallsign">
                <option v-for="callsign in availableCallsigns" :key="callsign" :value="callsign">
                    {{ callsign }}
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
                    v-if="routes.length"
                    :value="null">
                </option>
                <option v-for="airport in routes" :key="airport.id" :value="airport">
                    {{ airport.name }}
                </option>
            </select>
            <span> Destination: </span>
            <select
                v-model="selectedDestination">
                <option
                    v-if="routes.length"
                    :value="null">
                </option>
                <option v-for="airport in routes" :key="airport.id" :value="airport">
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

        <span v-if="isGeneratingRoute">
            Generating Route...
        </span>
        <div  v-if="foundTrip">
            <span>
                Found Trip -
                Aircraft: {{ generatedAircraftType }}
                <br>
                Route:
            </span>
            <table>
                <thead>
                <tr>
                    <th>#</th>
                    <th>Origin</th>
                    <th>Destination</th>
                    <th>Duration</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="(leg, index) in foundTrip?.legs" :key="leg.start + leg.end">
                    <td>{{ index + 1 }}</td>
                    <td>{{ leg.start }}</td>
                    <td>{{ leg.end }}</td>
                    <td>
                        {{ routes?.find((route) => route.icao === leg.start)?.destinations?.find((destination) => destination.icao === leg.end)?.time }}
                    </td>
                </tr>
                </tbody>
            </table>
        </div>
        <div v-else>
            No trip found
            {{ generatedAircraftType ? `for generated aircraft: ${generatedAircraftType} and ${generatedDeparture} departure airport` : '' }}
            , it might take a few attempts or try changing parameters. Try Again.
        </div>
    </div>
</template>

<script setup lang="ts">
    import { ref, computed, watch, onMounted } from 'vue';

    import spiritData from '../static/spirit.json';
    import aalData from '../static/aal.json';
    import ualData from '../static/ual.json';

    import type { Trip, Route, Destination } from '../types/types';
    import { airlines } from '../types/types';
    import { TripService } from '../services/trip-service';
    import { FilterUtils } from '../utils/filters';

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

    const allRoutes = computed(() => {
        switch(selectedAirline.value) {
            case airlines.SPIRIT:
                return spiritData.routes.sort((a, b) => FilterUtils.sortAlphabetically(a.name, b.name));
            case airlines.AMERICAN:
                return aalData.routes.sort((a, b) => FilterUtils.sortAlphabetically(a.name, b.name));
            case airlines.UNITED:
                return ualData.routes.sort((a, b) => FilterUtils.sortAlphabetically(a.name, b.name));
            default:
                return [];
        }
    });

    const routes = computed(() => {
        const routeFilteredByCallsing = selectedCallsign.value
            //@ts-ignore
            ? FilterUtils.filterDataByCallsign(allRoutes.value, selectedCallsign.value)
            : allRoutes.value;

        const routeFilteredByHours = hoursLimit.value !== 0
            ? FilterUtils.filterDataByHours(routeFilteredByCallsing, hoursLimit.value)
            : routeFilteredByCallsing;
        return FilterUtils.filterDataByAircraft(routeFilteredByHours, selectedAircraft.value);
    });

    //@ts-ignore
    const availableCallsigns = computed(() => FilterUtils.getAllCallsigns(allRoutes.value));

    const selectedCallsign = ref<string | null>(null);

    const selectedDeparture = ref<Route | null>(null);
    const selectedDestination = ref<Route | null>(null);

    const selectedAircraft = ref(null);

    const legCountOptions = ref([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 30, 50, 100]);
    const legNumber = ref(2);

    const hoursLimit = ref(0);
    const hoursLimitOptions = ref([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    const searchModes = ref(['Legs', 'Trips']);
    const selectedSearchMode = ref('Trips');

    const selectedAirline = ref(airlines.SPIRIT);
    const airlinesOptions = ref([airlines.SPIRIT, airlines.UNITED, airlines.AMERICAN]);

    const foundTrip = ref<Trip | null>(null);
    const generatedAircraftType = ref<string | null>(null);
    const generatedDeparture = ref<string | null>(null);

    const isGeneratingRoute = ref(false);

    watch(selectedAirline, () => {
        selectedCallsign.value = availableCallsigns.value[0] ?? null;
        chrome.storage.sync.get('extensionData', (result) => {
            if (result) {
                const parsedResult = JSON.parse(result.extensionData);
                const dataToSave = {
                    ...parsedResult,
                    selectedAirline: selectedAirline.value,
                };
                chrome.storage.sync.set({ 'extensionData': JSON.stringify(dataToSave) })
                    .then(() => console.log('Saved'))
                    .catch((error) => console.log({ error }));
            }
        });
    }, { immediate: true });

    onMounted(() => {
        chrome.storage.sync.get('extensionData', (result) => {
            if (result) {
                const parsedResult = JSON.parse(result.extensionData);
                foundTrip.value = parsedResult.trip;
                generatedAircraftType.value = parsedResult.aircraftType;
                selectedAirline.value = parsedResult.selectedAirline;
            }
        });
    });

    function calculateLegs() {
        if (isGeneratingRoute.value) {
            return;
        }

        const randomDepartureAirport = routes.value[Math.floor(Math.random() * routes.value.length)];
        const randomAircraft = randomDepartureAirport.aircrafts[Math.floor(Math.random() * randomDepartureAirport.aircrafts.length)];
        if (!randomDepartureAirport) {
            return;
        }

        switch (selectedSearchMode.value) {
            case 'Legs':
                console.log('Legs');
                break;
            case 'Trips':
                const startAirport = selectedDeparture.value?.icao ?? randomDepartureAirport.icao;
                const destinationAirport = selectedDestination.value?.icao ?? startAirport;
                const desiredHours = hoursLimit.value;
                const aircraftType = selectedAircraft.value ?? randomAircraft;
                const desiredLegs = legNumber.value;

                generatedAircraftType.value = null;
                foundTrip.value = null;
                try {
                    isGeneratingRoute.value = true;
                    const tripService = new TripService();
                    const tripsData = tripService.findTrip(
                        // @ts-ignore
                        routes.value,
                        startAirport,
                        destinationAirport,
                        desiredLegs + 1,
                        aircraftType,
                        desiredHours
                    );

                    chrome.storage.sync.set({
                        'extensionData': JSON.stringify({ ...tripsData, selectedAirline: selectedAirline.value })
                    }).then(() => {}).catch((error) => console.log({ error }));

                    foundTrip.value = tripsData.trip;
                    generatedAircraftType.value = tripsData.aircraftType;
                    generatedDeparture.value = destinationAirport;
                } catch (error) {
                    console.log({ error });
                } finally {
                    isGeneratingRoute.value = false;
                }
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

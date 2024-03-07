<template>
    <div class="popup-body"
         :class="{
            'spirit-theme': selectedAirline === airlines.SPIRIT,
            'american-theme': selectedAirline === airlines.AMERICAN,
            'united-theme': selectedAirline === airlines.UNITED }">
        <div class="form-container">
            <div>
                <span> VA: </span>
                <select v-model="selectedAirline">
                    <option v-for="airline in airlinesOptions" :key="airline" :value="airline">
                        {{ airline }}
                    </option>
                </select>
            </div>
            <div>
                <span> Airline: </span>
                <select v-model="selectedCallsign">
                    <option v-for="callsign in availableCallsigns" :key="callsign" :value="callsign">
                        {{ callsign }}
                    </option>
                </select>
            </div>
            <div>
            <span> Aircraft: </span>
                <select v-model="selectedAircraft">
                    <option
                        v-if="aircrafts?.length"
                        :value="null">
                    </option>
                    <option v-for="aircraft in aircrafts" :key="aircraft" :value="aircraft">
                        {{ aircraft }}
                    </option>
                </select>
            </div>
            <div>
                <span> Departure: </span>
                <select v-model="selectedDeparture">
                    <option
                        v-if="routes?.length"
                        :value="null">
                    </option>
                    <option v-for="airport in routes" :key="airport.id" :value="airport">
                        {{ airport.icao }} ( {{ airport.name }} )
                    </option>
                </select>
            </div>
            <div v-if="selectedDeparture">
                <span> Destination: </span>
                <select
                    v-model="selectedDestination">
                    <option
                        v-if="routes?.length"
                        :value="null">
                    </option>
                    <option v-for="airport in routes" :key="airport.id" :value="airport">
                        {{ airport.icao }} ( {{ airport.name }} )
                    </option>
                </select>
            </div>
            <div>
                <span> Leg number: </span>
                <select
                    v-model="legNumber">
                    <option v-for="leg in legCountOptions" :key="leg" :value="leg">
                        {{ leg }}
                    </option>
                </select>
            </div>
            <div>
                <span> Hour Limit per leg: </span>
                <select
                    v-model="hoursLimit">
                    <option v-for="hour in hoursLimitOptions" :key="hour" :value="hour">
                        {{ hour > 0 ? hour : 'No limit' }}
                    </option>
                </select>
            </div>
        </div>
        <button
            class="search-button"
            :disabled="isGeneratingRoute"
            @click="calculateLegs">
            Search
        </button>

        <span v-if="isGeneratingRoute">
            Generating Route...
        </span>
        <div v-if="foundTrip">
            <h2>Found Trip</h2>
            <p>
                Aircraft:
                <span class="generated-aircraft-type">
                    {{ generatedAircraftType }}
                </span>
            </p>
            <h2> Route: </h2>
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
                <tr v-for="(leg, index) in foundTrip?.legs">
                    <td>{{ index + 1 }}</td>
                    <td>{{ leg.start }}</td>
                    <td>{{ leg.end }}</td>
                    <td>
                        {{ allRoutes?.find((route) => route.icao === leg.start)?.destinations?.find((destination) => destination.icao === leg.end)?.time }}
                    </td>
                </tr>
                </tbody>
            </table>
        </div>
        <div class="error-message" v-else-if="generatedAircraftType || isError">
            <span v-if="routes?.length === 0">
                No possible trip found for selected parameters. Try changing parameters.
            </span>
            <span v-else-if="generatedAircraftType">
                No trip found for generated aircraft:
                {{ generatedAircraftType }}  and {{generatedDeparture}} departure airport,
                it might take a few attempts. Try changing parameters or search again.
            </span>
            <span v-else>
                No trip found for selected parameters. Try changing parameters or search again.
            </span>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { ref, computed, watch, onMounted } from 'vue';

    import spiritData from '../static/spirit.json';
    import aalData from '../static/aal.json';
    import ualData from '../static/ual.json';
    import spiritAircrafts from '../static/spiritAircrafts.json';
    import aalAircrafts from '../static/aalAircrafts.json';
    import ualAircrafts from '../static/unitedAircrafts.json';

    import type { Trip, Route } from '../types/types';
    import { airlines } from '../types/types';
    import { TripService } from '../services/trip-service';
    import { FilterUtils } from '../utils/filters';

    const aircrafts = computed<string[]>(() => {
        switch(selectedAirline.value) {
            case airlines.SPIRIT:
                //@ts-ignore
                return selectedCallsign.value ? spiritAircrafts[selectedCallsign.value] : spiritAircrafts['NKS'];
            case airlines.AMERICAN:
                //@ts-ignore
                return selectedCallsign.value ? aalAircrafts[selectedCallsign.value] : aalAircrafts['AAL'];
            case airlines.UNITED:
                //@ts-ignore
                return selectedCallsign.value ? ualAircrafts[selectedCallsign.value] : ualAircrafts['UAL'];
            default:
                return [];
        }
    });

    const allRoutes = computed(() => {
        switch(selectedAirline.value) {
            case airlines.SPIRIT:
                return spiritData.routes.sort((a, b) => FilterUtils.sortAlphabetically(a.icao, b.icao));
            case airlines.AMERICAN:
                return aalData.routes.sort((a, b) => FilterUtils.sortAlphabetically(a.icao, b.icao));
            case airlines.UNITED:
                return ualData.routes.sort((a, b) => FilterUtils.sortAlphabetically(a.icao, b.icao));
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

    const selectedAircraft = ref<string | null>(null);

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

    const isError = ref(false);

    watch(selectedAirline, async () => {
        selectedCallsign.value = availableCallsigns.value[0] ?? null;
        selectedDeparture.value = null;
        selectedDestination.value = null;
        selectedAircraft.value = null;
        try {
            const result = await browser.storage.local.get(selectedAirline.value);
            if (result && Object.keys(result).length > 0) {
                const parsedResult = JSON.parse(result?.[selectedAirline.value]);
                foundTrip.value = parsedResult?.trip ?? null;
                generatedAircraftType.value = parsedResult?.aircraftType ?? null;
            } else {
                foundTrip.value = null;
                generatedAircraftType.value = null;
            }
        } catch (error) {
            foundTrip.value = null;
            generatedAircraftType.value = null;
            console.log('Failed to get items from browser storage', { error });
        }

        browser.storage.local.set({ 'lastVisited': selectedAirline.value })
            .then(() => {})
            .catch((error) => console.log('Error setting lastVisted item', { error }));
    });

    onMounted(async () => {
        try {
            const lastVisitedResult = await browser.storage.local.get('lastVisited');
            if (lastVisitedResult) {
                selectedAirline.value = lastVisitedResult.lastVisited ?? airlines.SPIRIT;
                selectedCallsign.value = availableCallsigns.value[0] ?? null;
                const airlineResult = await browser.storage.local.get(selectedAirline.value)
                if (airlineResult && Object.keys(airlineResult).length > 0) {
                    const parsedResult = JSON.parse(airlineResult?.[selectedAirline.value]);
                    foundTrip.value = parsedResult?.trip ?? null;
                    generatedAircraftType.value = parsedResult?.aircraftType ?? null;
                } else {
                    foundTrip.value = null;
                    generatedAircraftType.value = null;
                }
            }
        } catch (error) {
            selectedAirline.value = airlines.SPIRIT;
            selectedCallsign.value = availableCallsigns.value[0] ?? null;
            foundTrip.value = null;
            generatedAircraftType.value = null;
            console.log('Failed to get items from browser storage', { error });
        }
    });

    async function calculateLegs() {
        if (isGeneratingRoute.value) {
            return;
        }

        isError.value = false;

        switch (selectedSearchMode.value) {
            case 'Legs':
                console.log('Legs');
                break;
            case 'Trips':
                const isSelectedAircraft = !!selectedAircraft.value;
                selectedAircraft.value ??=  getRandomAircraft();
                const startAirport = selectedDeparture.value?.icao ?? getRandomDepartureAirport()?.icao;
                const destinationAirport = selectedDestination.value?.icao ?? startAirport;
                const desiredHours = hoursLimit.value;
                const desiredLegs = legNumber.value;

                generatedAircraftType.value = null;
                foundTrip.value = null;
                try {
                    isGeneratingRoute.value = true;
                    let tripsData;
                    const tripService = new TripService();
                    for (let i = 0; i < 50; i++) {
                        const departureAirport = i == 0 ? startAirport : getRandomDepartureAirport()?.icao;
                        tripsData = tripService.findTrip(
                            // @ts-ignore
                            routes.value,
                            departureAirport,
                            destinationAirport,
                            desiredLegs + 1,
                            selectedAircraft.value || undefined,
                            desiredHours
                        );

                        if ((tripsData.trip) || selectedDeparture.value?.icao) {
                            break;
                        }
                    }

                    if (tripsData?.trip) {
                        await browser.storage.local.set({ [selectedAirline.value]: JSON.stringify(tripsData) });
                    }

                    foundTrip.value = tripsData?.trip ?? null;
                    generatedAircraftType.value = tripsData?.aircraftType ?? null;
                    generatedDeparture.value = destinationAirport;
                } catch (error) {
                    isError.value = true;
                    console.log('Error generating route', { error });
                } finally {
                    if (!isSelectedAircraft) {
                        selectedAircraft.value = null;
                    }
                    isGeneratingRoute.value = false;
                }
                break;
            default:
                console.log('Default');
        }
    }

    function getRandomDepartureAirport() {
        return routes.value[Math.floor(Math.random() * routes.value?.length)];
    }

    function getRandomAircraft() {
        return aircrafts.value[Math.floor(Math.random() * aircrafts.value?.length)];
    }
</script>

<style scoped>
    .popup-body {
        padding: 30px;
        font-family: Arial, sans-serif;
        box-sizing: border-box;
        font-size: 12px;
    }

    .form-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 20px;
    }

    .form-container > div > span {
        font-weight: bold;
        margin-bottom: 5px;
        font-size: 12px;
    }

    .form-container > select {
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
    }

    .form-container > div {
        display: flex;
        flex-direction: column;
    }

    button {
        background-color: #007bff;
        color: white;
        padding: 10px 20px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.3s ease;
    }

    button:hover {
        background-color: #0056b3;
    }

    button:active {
        background-color: #00428a;
    }

    button:disabled {
        opacity: 0.6;
        cursor: default;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    th, td {
        border: 1px solid #ddd;
        padding: 8px;
    }

    th {
        text-align: left;
        background-color: #f2f2f2;
    }

    h2 {
        font-size: 1.2em;
        margin-bottom: 10px;
    }

    .generated-aircraft-type {
        font-weight: bold;
    }

    .error-message {
        color: #d9534f;
        background-color: #ffe0e0;
        border: 1px solid #d43f3a;
        padding: 10px;
        margin: 15px 0;
    }

    .spirit-theme {
        background-color: #EFEFEF;
        color: #000;
    }

    .spirit-theme table th {
        background-color: black;
        color: #FAD400;
        border: 1px solid black;
        padding: 8px;
    }

    .spirit-theme table td {
        background-color: #FAD400;
        color: black;
        border: 1px solid black;
        padding: 8px;
    }

    .spirit-theme table tr:hover td {
        background-color: #ECDF8B;
    }

    .american-theme {
        background-color: #F9F9FC;
        color: #000;
    }

    .american-theme table th {
        background-color: #2A376E;
        color: #FFF;
        border: 1px solid black;
        padding: 8px;
    }

    .american-theme table td {
        background-color: #CBCBCB;
        color: #000;
        border: 1px solid black;
        padding: 8px;
    }

    .american-theme table tr:hover td {
        background-color: #D7D7D7;
    }

    .united-theme {
        background-color: #DEE6FC;
        color: #000;
    }

    .united-theme table th {
        background-color: #D13E2B;
        color: #FFF;
        border: 1px solid black;
        padding: 8px;
    }

    .united-theme table td {
        background-color: #172742;
        color: #FFF;
        border: 1px solid black;
        padding: 8px;
    }

    .united-theme table tr:hover td {
        background-color: #29426A;
    }

    .spirit-theme .search-button {
        background-color: black;
        color: #fad400;
        border: none;
        border-radius: 4px;
        padding: 10px 20px;
        cursor: pointer;
        transition: background-color 0.3s ease;
    }

    .spirit-theme .search-button:hover {
        background-color: #212121; /* Dark background */
        color: #fad400; /* Your yellow color */
    }

    .spirit-theme .search-button:active {
        background-color: #fad400; /* Your yellow color */
        color: #212121; /* Dark text */
    }

    .spirit-theme .search-button:disabled {
        background-color: #D1D1D1;
        color: #8C8C8C;
        opacity: 0.6;
        cursor: default;
    }

    .american-theme .search-button {
        background-color: #5867dd;
        color: #fff;
        border: none;
        border-radius: 4px;
        padding: 10px 20px;
        cursor: pointer;
        transition: background-color 0.3s ease;
    }

    .american-theme .search-button:hover {
        background-color: #8a94ff; /* Brighter color */
    }

    .american-theme .search-button:active {
        background-color: #303a61; /* Significantly darker */
    }

    .american-theme .search-button:disabled {
        background-color: #D1D1D1;
        color: #8C8C8C;
        opacity: 0.6;
        cursor: default;
    }

    .united-theme .search-button {
        background-color: #173d91;
        color: #FFF;
        border: none;
        border-radius: 4px;
        padding: 10px 20px;
        cursor: pointer;
        transition: background-color 0.3s ease;
    }

    .united-theme .search-button:hover {
        background-color: #213a65;
    }

    .united-theme .search-button:active {
        background-color: #0A1A2D;
    }

    .united-theme .search-button:disabled {
        background-color: #D1D1D1;
        color: #8C8C8C;
        opacity: 0.6;
        cursor: default;
    }
</style>

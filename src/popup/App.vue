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

        {{ availableCallsigns }}

        <p v-if="foundTrip">
            Found Trip -
            Aircraft: {{ generatedAircraftType }}, Route:
            <div v-for="leg in foundTrip.legs">
                <p>{{ leg.start }} -> {{ leg.end }}</p>
            </div>
        </p>
    </div>
</template>

<script setup lang="ts">
    import { ref, computed, onMounted } from 'vue';

    import spiritData from '../static/spirit.json';
    import aalData from '../static/aal.json';
    import ualData from '../static/ual.json';

    import type { Trip, Route, Destination } from '../types/types';
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
                return spiritData.routes.sort((a, b) => sortAlphabetically(a.name, b.name));
            case airlines.AMERICAN:
                return aalData.routes.sort((a, b) => sortAlphabetically(a.name, b.name));
            case airlines.UNITED:
                return ualData.routes.sort((a, b) => sortAlphabetically(a.name, b.name));
            default:
                return [];
        }
    });
    const departureAirports = computed(() => {
        return routes.value
            .filter(route => selectedAircraft.value ? route.aircrafts.includes(selectedAircraft.value) : true);
    });

    //@ts-ignore
    const availableCallsigns = computed(() => getAllCallsigns(routes.value));

    const selectedCallsign = ref(null);

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

    const isGeneratingRoute = ref(false);

    onMounted(() => {
        chrome.storage.sync.get('route', (result) => {
            if (result) {
                const parsedResult = JSON.parse(result.route);
                foundTrip.value = parsedResult.trip;
                generatedAircraftType.value = parsedResult.aircraftType;
            }
        });
    });

    function getAllCallsigns(data: Route[]): string[] {
        const allCallsigns = new Set<string>(); // Use a Set to ensure unique callsigns

        data.forEach(route => {
            route.destinations.forEach((destination: Destination) => {
                destination.callsigns.split(',').forEach((callsign: string) => {
                    allCallsigns.add(callsign.trim());
                });
            });
        });

        return Array.from(allCallsigns).sort(sortAlphabetically); // Convert Set back to array
    }

    function sortAlphabetically(a: string, b: string) {
        return a <= b ? -1 : 1;
    }

    function calculateLegs() {
        if (isGeneratingRoute.value) {
            return;
        }

        const randomDepartureAirport = departureAirports.value[Math.floor(Math.random() * departureAirports.value.length)];
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

                    chrome.storage.sync.set({'route': JSON.stringify(tripsData)})
                        .then(() => console.log('Saved'))
                        .catch((error) => console.log({ error }));

                    foundTrip.value = tripsData.trip;
                    generatedAircraftType.value = tripsData.aircraftType;
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

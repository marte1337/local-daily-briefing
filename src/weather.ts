import type { WeatherSummary } from "./types.js";

const LOCATION = "Bremen, Germany";
const LATITUDE = "53.0793";
const LONGITUDE = "8.8017";
const TIMEZONE = "Europe/Berlin";
const REQUEST_TIMEOUT_MS = 10_000;

type NonEmptyNumberArray = [number, ...number[]];

type OpenMeteoCurrent = {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
};

type OpenMeteoDaily = {
    temperature_2m_min: NonEmptyNumberArray;
    temperature_2m_max: NonEmptyNumberArray;
    precipitation_probability_max: NonEmptyNumberArray;
    weather_code: NonEmptyNumberArray;
};

type OpenMeteoResponse = {
    timezone: string;
    current: OpenMeteoCurrent;
    daily: OpenMeteoDaily;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function isNonEmptyNumberArray(value: unknown): value is NonEmptyNumberArray {
    return Array.isArray(value) && value.length > 0 && value.every(isFiniteNumber);
}

function isOpenMeteoResponse(value: unknown): value is OpenMeteoResponse {
    if (!isRecord(value) || !isRecord(value.current) || !isRecord(value.daily)) {
        return false;
    }

    return (
        typeof value.timezone === "string" &&
        isFiniteNumber(value.current.temperature_2m) &&
        isFiniteNumber(value.current.apparent_temperature) &&
        isFiniteNumber(value.current.weather_code) &&
        isFiniteNumber(value.current.wind_speed_10m) &&
        isNonEmptyNumberArray(value.daily.temperature_2m_min) &&
        isNonEmptyNumberArray(value.daily.temperature_2m_max) &&
        isNonEmptyNumberArray(value.daily.precipitation_probability_max) &&
        isNonEmptyNumberArray(value.daily.weather_code)
    );
}

function weatherCodeToCondition(code: number): string {
    switch (code) {
        case 0:
            return "Clear sky";
        case 1:
            return "Mainly clear";
        case 2:
            return "Partly cloudy";
        case 3:
            return "Overcast";
        case 45:
            return "Fog";
        case 48:
            return "Depositing rime fog";
        case 51:
            return "Light drizzle";
        case 53:
            return "Moderate drizzle";
        case 55:
            return "Dense drizzle";
        case 56:
            return "Light freezing drizzle";
        case 57:
            return "Dense freezing drizzle";
        case 61:
            return "Slight rain";
        case 63:
            return "Moderate rain";
        case 65:
            return "Heavy rain";
        case 66:
            return "Light freezing rain";
        case 67:
            return "Heavy freezing rain";
        case 71:
            return "Slight snowfall";
        case 73:
            return "Moderate snowfall";
        case 75:
            return "Heavy snowfall";
        case 77:
            return "Snow grains";
        case 80:
            return "Slight rain showers";
        case 81:
            return "Moderate rain showers";
        case 82:
            return "Violent rain showers";
        case 85:
            return "Slight snow showers";
        case 86:
            return "Heavy snow showers";
        case 95:
            return "Thunderstorm";
        case 96:
            return "Thunderstorm with slight hail";
        case 99:
            return "Thunderstorm with heavy hail";
        default:
            throw new Error(`Unsupported Open-Meteo weather code: ${code}`);
    }
}

function buildForecastUrl(): URL {
    const url = new URL("https://api.open-meteo.com/v1/forecast");

    url.searchParams.set("latitude", LATITUDE);
    url.searchParams.set("longitude", LONGITUDE);
    url.searchParams.set("current", "temperature_2m,apparent_temperature,weather_code,wind_speed_10m");
    url.searchParams.set("daily", "temperature_2m_min,temperature_2m_max,precipitation_probability_max,weather_code");
    url.searchParams.set("temperature_unit", "celsius");
    url.searchParams.set("wind_speed_unit", "kmh");
    url.searchParams.set("timezone", TIMEZONE);
    url.searchParams.set("forecast_days", "1");

    return url;
}

export async function getWeatherSummary(): Promise<WeatherSummary> {
    let response: Response;

    try {
        response = await fetch(buildForecastUrl(), {
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
    } catch (error) {
        throw new Error("Unable to reach the Open-Meteo weather API", { cause: error });
    }

    if (!response.ok) {
        const details = (await response.text()).trim();
        const suffix = details ? `: ${details}` : "";

        throw new Error(`Open-Meteo request failed with HTTP ${response.status} ${response.statusText}${suffix}`);
    }

    let data: unknown;

    try {
        data = await response.json();
    } catch (error) {
        throw new Error("Open-Meteo returned invalid JSON", { cause: error });
    }

    if (!isOpenMeteoResponse(data)) {
        throw new Error("Open-Meteo response is missing required weather fields or contains invalid values");
    }

    if (data.timezone !== TIMEZONE) {
        throw new Error(`Open-Meteo returned unexpected timezone: ${data.timezone}`);
    }

    return {
        location: LOCATION,
        currentTemperature: data.current.temperature_2m,
        apparentTemperature: data.current.apparent_temperature,
        currentCondition: weatherCodeToCondition(data.current.weather_code),
        windSpeed: data.current.wind_speed_10m,
        today: {
            minTemperature: data.daily.temperature_2m_min[0],
            maxTemperature: data.daily.temperature_2m_max[0],
            precipitationProbability: data.daily.precipitation_probability_max[0],
            condition: weatherCodeToCondition(data.daily.weather_code[0]),
        },
    };
}

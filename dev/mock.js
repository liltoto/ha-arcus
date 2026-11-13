const HOUR = 3600e3;
const DAY = 24 * HOUR;

function state(id, s, attrs = {}) {
  return {
    entity_id: id,
    state: String(s),
    attributes: attrs,
    last_changed: new Date(Date.now() - 800000).toISOString(),
    last_updated: new Date(Date.now() - 60000).toISOString(),
  };
}

export function makeHass() {
  const st = {};
  const add = (id, s, attrs) => (st[id] = state(id, s, attrs));

  add("person.liltoto", "home", { friendly_name: "liltoto" });
  add("sun.sun", "below_horizon", {
    elevation: -50.66, azimuth: 22.9, rising: true,
    next_dawn: "2026-11-13T06:00:00+00:00",
    next_dusk: "2026-11-13T15:50:52+00:00",
    next_rising: "2026-11-13T06:42:03+00:00",
    next_setting: "2026-11-13T15:08:52+00:00",
    next_noon: "2026-11-13T10:55:43+00:00",
  });
  add("weather.forecast_hjem", "partlycloudy", {
    temperature: 2.2, humidity: 87, pressure: 989, wind_speed: 23.4,
    wind_bearing: 275, cloud_coverage: 36.6, uv_index: 0,
    friendly_name: "Hjem",
  });
  add("sensor.outdoor_temperature", 2.2, { unit_of_measurement: "°C", friendly_name: "Outdoor Temperature" });
  add("sensor.outdoor_humidity", 87, { unit_of_measurement: "%", friendly_name: "Outdoor Humidity" });
  add("sensor.count_all_lights", 0, { friendly_name: "Count All Lights" });
  add("sensor.windows", 0, { friendly_name: "Windows" });
  add("binary_sensor.windows_left_open", "off", { friendly_name: "Windows Left Open" });

  const prayers = {
    fajr: "2026-11-13T04:32:00+00:00",
    dhuhr: "2026-11-13T10:56:00+00:00",
    asr: "2026-11-13T12:46:00+00:00",
    maghrib: "2026-11-13T15:09:00+00:00",
    isha: "2026-11-13T17:11:00+00:00",
  };
  Object.entries(prayers).forEach(([k, v]) =>
    add(`sensor.islamic_prayer_times_${k}_prayer`, v, { device_class: "timestamp", friendly_name: `Islamic Prayer Times ${k}` })
  );
  add("sensor.islamic_prayer_times_sunrise_time", "2026-11-13T06:42:00+00:00", { device_class: "timestamp", friendly_name: "Sunrise" });

  add("sensor.electricity_total_price", 1.75, { unit_of_measurement: "DKK/kWh", friendly_name: "Electricity Total Price" });
  add("sensor.electricity_sell_price", 1.0992, { unit_of_measurement: "DKK/kWh", friendly_name: "Electricity Sell Price" });
  add("sensor.nord_pool_dk2_current_price", 1.10922, { unit_of_measurement: "DKK/kWh", friendly_name: "Nord Pool current" });
  add("sensor.nord_pool_dk2_lowest_price", 0.61852, { unit_of_measurement: "DKK/kWh", friendly_name: "Lowest" });
  add("sensor.nord_pool_dk2_highest_price", 3.33, { unit_of_measurement: "DKK/kWh", friendly_name: "Highest" });
  add("sensor.nord_pool_dk2_next_price", 1.62, { unit_of_measurement: "DKK/kWh", friendly_name: "Next" });
  add("sensor.nord_pool_dk2_previous_price", 1.64, { unit_of_measurement: "DKK/kWh", friendly_name: "Previous" });
  add("binary_sensor.nord_pool_dk2_tomorrow_price_available", "off", { friendly_name: "Tomorrow" });
  const today = [1.645, 1.58, 1.53, 1.49, 1.44, 1.51, 1.72, 1.86, 2.05, 1.98, 1.82, 1.55, 1.379, 1.42, 1.55, 1.72, 2.15, 3.333, 3.12, 2.78, 2.31, 1.92, 1.74, 1.66];
  add("sensor.energi_data_service", 1.64639407410297, {
    unit_of_measurement: "DKK/kWh", currency: "DKK", region: "East of the great belt",
    current_price: 1.64639407410297, tomorrow_valid: false,
    today, raw_today: today.map((p, i) => ({ hour: `2026-11-13T${String(i).padStart(2, "0")}:00:00+01:00`, price: p })),
    raw_tomorrow: null,
    today_min: { hour: "2026-11-13T12:00:00+01:00", price: 1.379 },
    today_max: { hour: "2026-11-13T17:00:00+01:00", price: 3.333 },
    today_mean: 2.024,
  });

  add("sensor.sunmate_io_pulse_ee40a0_pulse_pv_totalpower", 0, { unit_of_measurement: "W", device_class: "power", friendly_name: "Sol effekt" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_load_w_totalpower", 665, { unit_of_measurement: "W", device_class: "power", friendly_name: "Husforbrug effekt" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_battery_soc", 27, { unit_of_measurement: "%", device_class: "battery", friendly_name: "Batteri SoC" });
  add("sensor.pulse_batteri_effekt", -320, { unit_of_measurement: "W", friendly_name: "Batteri effekt" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_daily_energy_sold", 0.3, { unit_of_measurement: "kWh", friendly_name: "Solgt i dag" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_daily_energy_bought", 0.3, { unit_of_measurement: "kWh", friendly_name: "Købt i dag" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_daily_production", 15.27, { unit_of_measurement: "kWh", friendly_name: "Produktion i dag" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_daily_energy_houseload", 0.9, { unit_of_measurement: "kWh", friendly_name: "Husforbrug i dag" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_total_production", 15420, { unit_of_measurement: "kWh", friendly_name: "Total produceret" });
  add("sensor.sol_denne_maned", 109.6, { unit_of_measurement: "kWh", friendly_name: "Sol denne måned" });
  add("sensor.sol_i_ar", 122.3, { unit_of_measurement: "kWh", friendly_name: "Sol i år" });
  add("sensor.net_i_dag", 0.0, { unit_of_measurement: "kWh", friendly_name: "Net i dag" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_grid_out_total_power", -665, { unit_of_measurement: "W", friendly_name: "Net effekt" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_grid_current_a_l1", 1.01, { unit_of_measurement: "A", friendly_name: "Net L1" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_grid_current_a_l2", 2.37, { unit_of_measurement: "A", friendly_name: "Net L2" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_grid_current_a_l3", 0.97, { unit_of_measurement: "A", friendly_name: "Net L3" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_pv3_power", 0, { unit_of_measurement: "W", friendly_name: "PV3 effekt" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_pv4_power", 0, { unit_of_measurement: "W", friendly_name: "PV4 effekt" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_pv3_voltage", 4.7, { unit_of_measurement: "V", friendly_name: "PV3 spænding" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_pv4_voltage", 3.0, { unit_of_measurement: "V", friendly_name: "PV4 spænding" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_pv3_current", 0, { unit_of_measurement: "A", friendly_name: "PV3 strøm" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_pv4_current", 0, { unit_of_measurement: "A", friendly_name: "PV4 strøm" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_battery_temperature", 23.9, { unit_of_measurement: "°C", friendly_name: "Batteri temperatur" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_battery_voltage", 51.2, { unit_of_measurement: "V", friendly_name: "Batteri spænding" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_battery_output_a", -6.2, { unit_of_measurement: "A", friendly_name: "Batteri strøm" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_inverter_temperature", 34.1, { unit_of_measurement: "°C", friendly_name: "Inverter temp." });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_daily_battery_charge", 4.2, { unit_of_measurement: "kWh", friendly_name: "Batteri ladning i dag" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_daily_battery_discharge", 3.1, { unit_of_measurement: "kWh", friendly_name: "Batteri afladning i dag" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_wifi_signal", -32, { unit_of_measurement: "dBm", friendly_name: "WiFi signal" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_uptime", 442661, { unit_of_measurement: "s", friendly_name: "Oppetid" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_temperature", 56.1, { unit_of_measurement: "°C", friendly_name: "Pulse temperatur" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_inverter_frequency", 49.98, { unit_of_measurement: "Hz", friendly_name: "Netfrekvens" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_inverter_serial", "103315125B240074", { friendly_name: "Serienummer" });
  add("sensor.sunmate_io_pulse_ee40a0_datalogger_pulse_ip", "192.168.110.78", { friendly_name: "IP-adresse" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_inverter_model_fw", "S6-3PH-HV-12-20kW-v2;FW:1262", { friendly_name: "Model og firmware" });
  add("sensor.sunmate_io_pulse_ee40a0_pulse_datalogger_version", "solis_tcan485_netbal_v849", { friendly_name: "Datalogger firmware" });
  add("number.sunmate_io_pulse_ee40a0_pulse_battery_min_soc", 10, { min: 0, max: 100, step: 1, friendly_name: "Min. SoC" });
  add("number.sunmate_io_pulse_ee40a0_pulse_battery_max_soc", 95, { min: 0, max: 100, step: 1, friendly_name: "Maks. SoC" });
  add("sensor.hjem_energy_production_today", 15.2745, { unit_of_measurement: "kWh", friendly_name: "Prognose i dag" });
  add("sensor.hjem_energy_production_today_remaining", 15.3665, { unit_of_measurement: "kWh", friendly_name: "Rest i dag" });
  add("sensor.hjem_power_production_now", 0, { unit_of_measurement: "W", friendly_name: "Prognose nu" });
  add("sensor.hjem_energy_current_hour", 0.3, { unit_of_measurement: "kWh", friendly_name: "Denne time" });
  add("sensor.hjem_energy_next_hour", 0.2, { unit_of_measurement: "kWh", friendly_name: "Næste time" });
  add("sensor.hjem_power_production_next_24hours", 0, { unit_of_measurement: "W", friendly_name: "Næste 24 t" });
  add("sensor.hjem_energy_production_tomorrow", 12.089, { unit_of_measurement: "kWh", friendly_name: "I morgen" });
  add("sensor.hjem_energy_production_d2", 8.7, { unit_of_measurement: "kWh", friendly_name: "Om 2 dage" });
  add("sensor.hjem_energy_production_d3", 11.4, { unit_of_measurement: "kWh", friendly_name: "Om 3 dage" });
  const watts = {};
  for (let i = 0; i < 96; i++) {
    const h = i / 4;
    const v = h < 7.5 || h > 15.8 ? 0 : Math.max(0, Math.sin(((h - 7.5) / 8.3) * Math.PI) * 3054);
    watts[`2026-11-13T${String(Math.floor(h)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}:00+01:00`] = Math.round(v);
  }
  st["sensor.hjem_energy_production_today"].attributes.watts = watts;
  const w2 = {};
  for (let i = 0; i < 96; i++) {
    const h = i / 4;
    const v = h < 7.2 || h > 16 ? 0 : Math.max(0, Math.sin(((h - 7.2) / 8.8) * Math.PI) * 2600);
    w2[`2026-11-14T${String(Math.floor(h)).padStart(2, "0")}:${String((i % 4) * 15).padStart(2, "0")}:00+01:00`] = Math.round(v);
  }
  st["sensor.hjem_energy_production_tomorrow"].attributes.watts = w2;

  add("sensor.bwt_perla_state", "OK", { options: ["OK", "WARNING", "ERROR"], friendly_name: "BWT state" });
  add("sensor.bwt_perla_current_flow", 0.0, { unit_of_measurement: "m³/h", friendly_name: "BWT flow" });
  add("sensor.bwt_perla_day_output", 12.222, { unit_of_measurement: "L", friendly_name: "BWT dag" });
  add("sensor.bwt_perla_month_output", 2962.67, { unit_of_measurement: "L", friendly_name: "BWT måned" });
  add("sensor.bwt_perla_year_output", 56833.3, { unit_of_measurement: "L", friendly_name: "BWT år" });
  add("sensor.bwt_perla_total_output", 56987, { unit_of_measurement: "L", friendly_name: "BWT total" });
  add("sensor.bwt_vand_m3", 56.987, { unit_of_measurement: "m³", friendly_name: "BWT m3" });
  add("sensor.vandudgift_total", 4010.49, { unit_of_measurement: "DKK", friendly_name: "Vandudgift" });
  add("sensor.bwt_perla_regenerativ_level", 41, { unit_of_measurement: "%", friendly_name: "Salt" });
  add("sensor.bwt_perla_regenerativ_days", 35, { unit_of_measurement: "d", friendly_name: "Salt dage" });
  add("sensor.bwt_perla_capacity_1", 66.885, { unit_of_measurement: "L", friendly_name: "Kapacitet" });
  add("input_boolean.bwt_holiday_mode", "off", { friendly_name: "BWT Holiday Mode" });
  add("binary_sensor.klippbok_water_leak_sensor_water_leak", "off", { friendly_name: "KLIPPBOK køkken" });
  add("binary_sensor.klippbok_water_leak_sensor_water_leak_2", "off", { friendly_name: "KLIPPBOK bryggers" });
  add("sensor.klippbok_water_leak_sensor_batteri", 88, { unit_of_measurement: "%", friendly_name: "KLIPPBOK batteri" });
  add("sensor.klippbok_water_leak_sensor_batteri_2", 91, { unit_of_measurement: "%", friendly_name: "KLIPPBOK batteri 2" });

  // rum
  add("sensor.alpstuga_air_quality_monitor_temperatur_2", "unavailable", { unit_of_measurement: "°C", friendly_name: "Stue temp" });
  add("sensor.alpstuga_air_quality_monitor_luftfugtighed_2", "unavailable", { unit_of_measurement: "%", friendly_name: "Stue fugt" });
  add("sensor.alpstuga_air_quality_monitor_carbon_dioxide_2", "unavailable", { unit_of_measurement: "ppm", friendly_name: "Stue CO2" });
  add("sensor.alpstuga_air_quality_monitor_pm25_2", "unavailable", { unit_of_measurement: "µg/m³", friendly_name: "Stue PM2.5" });
  add("sensor.timmerflotte_temp_hmd_sensor_temperatur_2", 22.9, { unit_of_measurement: "°C", friendly_name: "Soveværelse temp" });
  add("sensor.timmerflotte_temp_hmd_sensor_luftfugtighed_2", 44, { unit_of_measurement: "%", friendly_name: "Soveværelse fugt" });
  add("sensor.timmerflotte_temp_hmd_sensor_temperatur", 18.4, { unit_of_measurement: "°C", friendly_name: "Skur temp" });
  add("sensor.timmerflotte_temp_hmd_sensor_luftfugtighed", 62, { unit_of_measurement: "%", friendly_name: "Skur fugt" });
  add("sensor.alpstuga_air_quality_monitor_temperatur", 24.4, { unit_of_measurement: "°C", friendly_name: "Kontor temp" });
  add("sensor.alpstuga_air_quality_monitor_luftfugtighed", 41, { unit_of_measurement: "%", friendly_name: "Kontor fugt" });
  add("sensor.alpstuga_air_quality_monitor_carbon_dioxide", 620, { unit_of_measurement: "ppm", friendly_name: "Kontor CO2" });
  add("sensor.alpstuga_air_quality_monitor_pm25", 4.2, { unit_of_measurement: "µg/m³", friendly_name: "Kontor PM2.5" });
  add("sensor.alpstuga_air_quality_monitor_temperatur_3", 24.2, { unit_of_measurement: "°C", friendly_name: "Bryggers temp" });
  add("sensor.alpstuga_air_quality_monitor_luftfugtighed_3", 46, { unit_of_measurement: "%", friendly_name: "Bryggers fugt" });
  add("sensor.alpstuga_air_quality_monitor_carbon_dioxide_3", 540, { unit_of_measurement: "ppm", friendly_name: "Bryggers CO2" });
  add("sensor.alpstuga_air_quality_monitor_pm25_3", 3.6, { unit_of_measurement: "µg/m³", friendly_name: "Bryggers PM2.5" });
  add("sensor.myggspray_wrlss_mtn_sensor_belysningsstyrke", 24, { unit_of_measurement: "lx", friendly_name: "Entre lys" });
  add("binary_sensor.myggspray_wrlss_mtn_sensor_tilstedevaerelse", "off", { friendly_name: "Entre bevægelse" });
  add("sensor.bilresa_dual_button_batteri", 74, { unit_of_measurement: "%", friendly_name: "Bilresa batteri" });

  // døre/vinduer
  const doors = [
    ["binary_sensor.myggbett_door_window_sensor_dor", "Kontor", "door"],
    ["binary_sensor.myggbett_door_window_sensor_dor_2", "Lille Badeværelse", "door"],
    ["binary_sensor.myggbett_door_window_sensor_dor_3", "Køkken", "door"],
    ["binary_sensor.myggbett_door_window_sensor_dor_5", "Badeværelse", "door"],
    ["binary_sensor.myggbett_door_window_sensor_dor_6", "Soveværelse", "door"],
    ["binary_sensor.myggbett_door_window_sensor_dor_7", "Stue Dør", "door"],
    ["binary_sensor.myggbett_door_window_sensor_dor_4", "Spisestue", "window"],
    ["binary_sensor.myggbett_door_window_sensor_dor_8", "Stue Vindue", "window"],
  ];
  doors.forEach(([id, name, dc]) => add(id, "off", { device_class: dc, friendly_name: name }));
  const batt = [
    ["sensor.myggbett_door_window_sensor_batteri_7", "Stue Dør", 82],
    ["sensor.myggbett_door_window_sensor_batteri_8", "Stue Vindue", 79],
    ["sensor.myggbett_door_window_sensor_batteri_4", "Spisestue", 68],
    ["sensor.myggbett_door_window_sensor_batteri_6", "Soveværelse", 91],
    ["sensor.myggbett_door_window_sensor_batteri", "Kontor", 55],
    ["sensor.myggbett_door_window_sensor_batteri_2", "Lille Badeværelse", 17],
    ["sensor.myggbett_door_window_sensor_batteri_5", "Stor Badeværelse", 73],
    ["sensor.myggbett_door_window_sensor_batteri_3", "Køkken Dør", 64],
    ["sensor.myggspray_wrlss_mtn_sensor_batteri", "Entre bevægelse", 88],
    ["sensor.bilresa_dual_button_batteri_2", "Bilresa Køkken", 71],
    ["sensor.timmerflotte_temp_hmd_sensor_batteri", "Skur", 63],
    ["sensor.timmerflotte_temp_hmd_sensor_batteri_2", "Soveværelse", 47],
  ];
  batt.forEach(([id, name, v]) => add(id, v, { unit_of_measurement: "%", friendly_name: name }));

  // lys
  const lights = [
    ["light.kokken", "Køkken"],
    ["light.bryggers", "Bryggers"],
    ["light.entre", "Entre"],
    ["light.lille_gang", "Lille Gang"],
    ["light.192_168_110_242_enhaettelys", "Emhættelys"],
  ];
  for (let i = 0; i < 21; i++) lights.push([`light.kajplats_gu10_cws_470lm${i ? "_" + i : ""}`, `KAJPLATS ${i + 1}`]);
  [...new Set(lights.map((l) => l[0]))].forEach(([id, name] = []) => {});
  lights.forEach(([id, name]) => add(id, "off", { friendly_name: name, brightness: 0, supported_color_modes: ["color_temp", "hs"] }));

  // klima
  add("climate.nilan602_nilan", "heat_cool", {
    hvac_modes: ["heat_cool", "cool", "heat"], min_temp: 5, max_temp: 30, target_temp_step: 1,
    fan_modes: ["off", "1", "2", "3", "4"], current_temperature: 23.2, temperature: 23, fan_mode: "2",
    friendly_name: "Nilan",
  });
  const wavin = [
    ["stue", "Stue", 22.9, 23],
    ["kokken", "Køkken", 23.9, 23],
    ["sovevaerelse", "Soveværelse", 22.9, 23],
    ["kontor", "Kontor", 24.4, 23],
    ["bryggers", "Bryggers", 24.2, 23],
    ["lille_badevaerelse", "Lille Badeværelse", 23.2, 23],
    ["stor_badevaerelse", "Stor Badeværelse", 22.9, 23],
    ["entre", "Entre", 21.0, 19],
    ["kanal_6", "Kanal 6", 22.9, 23],
    ["kanal_10", "Kanal 10", 22.4, 23],
    ["kanal_11", "Kanal 11", 22.1, 23],
  ];
  wavin.forEach(([key, name, cur, tar]) => {
    add(`climate.wavin_${key}`, "heat", {
      hvac_modes: ["off", "heat"], min_temp: 5, max_temp: 35, target_temp_step: 0.5,
      current_temperature: cur, temperature: tar, hvac_action: cur < tar ? "heating" : "idle",
      friendly_name: name,
    });
  });
  ["stue", "kokken", "sovevaerelse", "kontor", "bryggers", "lille_badevaerelse", "stor_badevaerelse"].forEach((k) => {
    add(`binary_sensor.gulvvarme_${k}_abninger`, "off", { friendly_name: `Gulvvarme ${k} åbninger` });
  });
  add("input_number.gulvvarme_standardtemperatur", 23, { min: 5, max: 35, step: 0.5, friendly_name: "Standardtemperatur" });
  add("input_number.gulvvarme_saenket_temperatur", 15, { min: 5, max: 35, step: 0.5, friendly_name: "Sænket temperatur" });

  // Nilan
  add("sensor.nilan602_actual_room_temperature", 23.2, { unit_of_measurement: "°C", friendly_name: "Nilan rumtemp" });
  add("sensor.nilan602_humidity", 37.98, { unit_of_measurement: "%", friendly_name: "Nilan fugt" });
  add("sensor.nilan602_actual_fan_step", 2, { friendly_name: "Nilan fan step" });
  add("sensor.nilan602_outdoor_temperature", 4.47, { unit_of_measurement: "°C", friendly_name: "Nilan ude" });
  add("sensor.nilan602_outlet_temperature", 10.84, { unit_of_measurement: "°C", friendly_name: "Nilan udblæs" });
  add("sensor.nilan602_exhaust_temperature", 23.19, { unit_of_measurement: "°C", friendly_name: "Nilan afkast" });
  add("sensor.nilan602_inlet_after_heater_temperature", 22.82, { unit_of_measurement: "°C", friendly_name: "Nilan indtag" });
  add("sensor.nilan602_heat_exchange_efficiency", 97.97, { unit_of_measurement: "%", friendly_name: "Nilan effektivitet" });
  add("sensor.nilan602_exhaust_fan_speed", 38, { unit_of_measurement: "%", friendly_name: "Nilan afkast hastighed" });
  add("sensor.nilan602_inlet_fan_speed", 26, { unit_of_measurement: "%", friendly_name: "Nilan indtag hastighed" });
  add("sensor.nilan602_air_filter_alarm_status", "Skift filter", { friendly_name: "Nilan filter" });
  add("sensor.nilan602_days_since_last_filter_change_alarm", 0, { unit_of_measurement: "d", friendly_name: "Dage siden filter" });
  add("sensor.nilan602_days_to_next_filter_change_alarm", 0, { unit_of_measurement: "d", friendly_name: "Dage til filter" });
  add("sensor.nilan602_operation_mode", "Auto", { friendly_name: "Nilan drift" });
  add("sensor.nilan602_software_version", "2.1.35", { friendly_name: "Nilan software" });
  add("sensor.nilan602_aggregate_type", "VPL 10 uden køl", { friendly_name: "Nilan type" });
  add("select.nilan602_set_user_function", "None", { options: ["None", "Extend", "Inlet", "Exhaust", "External heater offset", "Ventilate", "Cooker Hood"], friendly_name: "Brugervalg 1" });
  add("select.nilan602_set_user_function_2", "None", { options: ["None", "Extend", "Inlet", "Exhaust", "External heater offset", "Ventilate", "Cooker Hood"], friendly_name: "Brugervalg 2" });
  add("number.nilan602_user_time_set_minutes", 0, { min: 1, max: 480, step: 1, friendly_name: "Brugertid" });
  add("number.nilan602_user_ventilation_speed_set", 3, { min: 0, max: 4, step: 1, friendly_name: "Brugerhastighed" });
  add("button.nilan602_reset_alarm", "unknown", { friendly_name: "Reset alarm" });

  // emhætte
  add("fan.192_168_110_242_emhaette", "off", { preset_modes: ["low", "medium", "high", "boost"], percentage: 0, percentage_step: 25, preset_mode: null, runtime_hours: 13.82, filter_time: 13.82, threshold: 30, alert: false, friendly_name: "Thermex Hood" });
  add("sensor.192_168_110_242_filter_driftstimer_siden_sidste_nulstilling", 13.82, { unit_of_measurement: "h", friendly_name: "Filter driftstimer" });
  add("binary_sensor.192_168_110_242_kraever_filterrensning", "off", { friendly_name: "Filterrensning" });

  // energi-apparater
  add("sensor.grillplats_plug_effekt", 23.8, { unit_of_measurement: "W", friendly_name: "Fryser effekt" });
  add("sensor.grillplats_plug_effekt_2", 69.2, { unit_of_measurement: "W", friendly_name: "Server effekt" });
  add("sensor.grillplats_plug_energi", 145.9, { unit_of_measurement: "kWh", friendly_name: "Fryser energi" });
  add("sensor.grillplats_plug_energi_2", 368.1, { unit_of_measurement: "kWh", friendly_name: "Server energi" });
  add("sensor.kontor_grillplats_pc_elektrisk_effekt", 181.7, { unit_of_measurement: "W", friendly_name: "PC effekt" });
  add("sensor.kontor_grillplats_pc_energi", 15.2, { unit_of_measurement: "kWh", friendly_name: "PC energi" });
  add("switch.grillplats_plug", "on", { friendly_name: "Fryser stik" });
  add("switch.grillplats_plug_2", "on", { friendly_name: "Server stik" });
  add("switch.kontor_grillplats_pc", "on", { friendly_name: "PC stik" });
  add("sensor.all_standby_power", 3.2, { unit_of_measurement: "W", friendly_name: "Standby effekt" });
  add("sensor.all_standby_energy", 19.705, { unit_of_measurement: "kWh", friendly_name: "Standby energi" });
  add("binary_sensor.tesla_wall_connector_koretoj_tilsluttet", "off", { friendly_name: "Tesla tilsluttet" });
  add("sensor.tesla_wall_connector_total_power", 0, { unit_of_measurement: "kW", friendly_name: "Tesla effekt" });
  add("sensor.tesla_wall_connector_energi_til_sessionen", 0, { unit_of_measurement: "kWh", friendly_name: "Tesla session" });
  add("sensor.tesla_wall_connector_energi", 1420.2, { unit_of_measurement: "kWh", friendly_name: "Tesla total" });

  // netværk
  add("binary_sensor.192_168_110_1", "on", { friendly_name: "Router" });
  add("sensor.192_168_110_1_round_trip_time_average", 0.337, { unit_of_measurement: "ms", friendly_name: "RTT" });
  add("sensor.192_168_110_1_packet_loss", 0, { unit_of_measurement: "%", friendly_name: "Pakketab" });
  add("sensor.192_168_110_1_router_packet_loss", 0, { unit_of_measurement: "%", friendly_name: "Pakketab 24t" });
  add("sensor.192_168_110_1_router_packet_loss_168h", 1.61, { unit_of_measurement: "%", friendly_name: "Pakketab 7d" });
  add("sensor.192_168_110_1_router_rtt_mean_24h", 0.39, { unit_of_measurement: "ms", friendly_name: "RTT 24t" });
  add("sensor.192_168_110_1_router_rtt_mean_168h", 0.39, { unit_of_measurement: "ms", friendly_name: "RTT 7d" });
  add("sensor.192_168_110_1_jitter", 0.048, { unit_of_measurement: "ms", friendly_name: "Jitter" });
  add("binary_sensor.8_8_8_8", "on", { friendly_name: "Google" });
  add("sensor.8_8_8_8_round_trip_time_average", 8.078, { unit_of_measurement: "ms", friendly_name: "Google RTT" });
  add("sensor.8_8_8_8_packet_loss", 0, { unit_of_measurement: "%", friendly_name: "Google pakketab" });
  add("sensor.8_8_8_8_jitter", 0.11, { unit_of_measurement: "ms", friendly_name: "Google jitter" });
  add("binary_sensor.1_1_1_1", "off", { friendly_name: "Cloudflare" });
  add("sensor.1_1_1_1_round_trip_time_average", "unavailable", { unit_of_measurement: "ms", friendly_name: "Cloudflare RTT" });
  add("sensor.1_1_1_1_packet_loss", 100, { unit_of_measurement: "%", friendly_name: "Cloudflare pakketab" });
  add("sensor.1_1_1_1_jitter", "unavailable", { unit_of_measurement: "ms", friendly_name: "Cloudflare jitter" });

  // økonomi
  add("sensor.40ndasdro56_kurs", 97.15, { unit_of_measurement: "%", friendly_name: "4,0NDASDRO56 kurs" });
  add("sensor.40ndasdro56_aendring", 0.22, { unit_of_measurement: "%", friendly_name: "Ændring" });
  add("sensor.40ndasdro56_effektiv_rente", 4.339, { unit_of_measurement: "%", friendly_name: "Effektiv rente" });
  add("sensor.40ndasdro56_varighed", 11.311, { unit_of_measurement: "år", friendly_name: "Varighed" });

  // sparet
  add("sensor.sparet_total", 1542.33, { unit_of_measurement: "DKK", friendly_name: "Sparet total" });
  add("sensor.sparet_solceller", 998.2, { unit_of_measurement: "DKK", friendly_name: "Sparet solceller" });
  add("sensor.sparet_batteri", 544.13, { unit_of_measurement: "DKK", friendly_name: "Sparet batteri" });
  add("sensor.besparelse_rate_total", 1.1533, { unit_of_measurement: "DKK/h", friendly_name: "Besparelse rate" });
  add("sensor.besparelse_rate_batteri_ac", 0.42, { unit_of_measurement: "DKK/h", friendly_name: "Batteri rate" });
  add("sensor.tilbagebetalt_total", 1.1, { unit_of_measurement: "%", friendly_name: "Tilbagebetalt" });
  add("sensor.tilbagebetalt_solceller", 0.8, { unit_of_measurement: "%", friendly_name: "Tilbagebetalt sol" });
  add("sensor.tilbagebetalt_batteri", 0.3, { unit_of_measurement: "%", friendly_name: "Tilbagebetalt batteri" });
  add("input_number.investering_solceller", 85000, { min: 0, max: 500000, step: 1000, friendly_name: "Investering solceller" });
  add("input_number.investering_batteri", 45000, { min: 0, max: 500000, step: 1000, friendly_name: "Investering batteri" });
  add("input_datetime.anlaeg_installeret", "2026-09-18", { friendly_name: "Anlæg installeret" });

  // automatik
  add("input_boolean.window_alert_notification", "off", { friendly_name: "Vindue-alarm" });
  add("input_boolean.vacation_mode", "off", { friendly_name: "Ferietilstand" });
  add("input_button.bedtime", "2026-10-29T18:41:45+00:00", { friendly_name: "Bedtime" });
  add("media_player.lg_speaker_sp8ya_2", "off", { friendly_name: "LG Soundbar" });
  add("sensor.myggbett_door_window_sensor_dor_7_batteri", 82, { unit_of_measurement: "%", friendly_name: "Stue dør batteri" });

  // de 21 rigtige lys-id'er fra dashboardet
  const realLights = [
    "light.kajplats_gu10_cws_470lm_7", "light.kajplats_gu10_cws_470lm_8", "light.kajplats_gu10_cws_470lm",
    "light.kajplats_gu10_cws_470lm_2", "light.kajplats_gu10_cws_470lm_3", "light.kajplats_gu10_cws_470lm_5",
    "light.kajplats_gu10_cws_470lm_4", "light.kajplats_gu10_cws_470lm_6", "light.kajplats_gu10_cws_470lm_9",
    "light.kajplats_gu10_cws_470lm_14", "light.kajplats_gu10_cws_470lm_16", "light.kajplats_gu10_cws_470lm_15",
    "light.kajplats_gu10_cws_470lm_12", "light.kajplats_gu10_cws_470lm_13", "light.kajplats_gu10_cws_470lm_10",
    "light.kajplats_gu10_cws_470lm_11",
  ];
  realLights.forEach((id, i) => add(id, "off", { friendly_name: `Spot ${i + 1}`, brightness: 0, supported_color_modes: ["color_temp", "hs"] }));

  const hass = {
    states: st,
    user: { name: "liltoto", is_admin: true },
    themes: { darkMode: true },
    language: "da",
    callService: async (domain, service, data, target) => {
      console.log("service", domain, service, data, target);
      const ids = [];
      if (target?.entity_id) ids.push(...(Array.isArray(target.entity_id) ? target.entity_id : [target.entity_id]));
      if (target?.area_id) return;
      ids.forEach((id) => {
        if (!st[id]) return;
        if (service === "toggle") st[id].state = st[id].state === "on" ? "off" : "on";
        if (service === "turn_on") st[id].state = "on";
        if (service === "turn_off") st[id].state = "off";
        if (service === "set_temperature") st[id].attributes.temperature = data.temperature;
        if (service === "set_hvac_mode") st[id].state = data.hvac_mode;
        if (service === "set_fan_mode") st[id].attributes.fan_mode = data.fan_mode;
      });
      return {};
    },
    callWS: async (msg) => {
      if (msg.type !== "history/history_during_period") return {};
      return makeHistory(msg.entity_ids, new Date(msg.start_time), new Date(msg.end_time));
    },
    callApi: async (method, path, body) => {
      if (String(path).includes("get_forecasts")) {
        return {
          service_response: {
            "weather.forecast_hjem": {
              forecast: [
                { datetime: "2026-11-13T12:00:00+01:00", condition: "partlycloudy", temperature: 4.2, templow: 1.1, precipitation: 0.2, wind_speed: 22 },
                { datetime: "2026-11-14T12:00:00+01:00", condition: "rainy", temperature: 6.1, templow: 3.4, precipitation: 3.1, wind_speed: 28 },
                { datetime: "2026-11-15T12:00:00+01:00", condition: "cloudy", temperature: 5.4, templow: 2.8, precipitation: 0.4, wind_speed: 18 },
                { datetime: "2026-11-16T12:00:00+01:00", condition: "sunny", temperature: 4.8, templow: 0.2, precipitation: 0, wind_speed: 12 },
                { datetime: "2026-11-17T12:00:00+01:00", condition: "snowy", temperature: 1.2, templow: -2.1, precipitation: 1.2, wind_speed: 20 },
              ],
            },
          },
        };
      }
      return {};
    },
  };
  return hass;
}

export function makeHistory(ids, start, end) {
  const out = {};
  const span = end.getTime() - start.getTime();
  const step = span > 40 * DAY ? 12 * HOUR : span > 3 * DAY ? 2 * HOUR : 15 * 60e3;
  const t0 = start.getTime();
  const n = Math.max(2, Math.floor(span / step));

  for (const id of ids) {
    const rows = [];
    for (let i = 0; i < n; i++) {
      const t = t0 + i * step;
      const d = new Date(t);
      const h = d.getHours() + d.getMinutes() / 60;
      const x = d.getTime() / HOUR;
      let v = null;
      if (id.includes("alpstuga") && id.endsWith("_2")) v = null;
      else if (id.includes("alpstuga") && id.includes("carbon_dioxide")) v = 620 + 240 * Math.sin((x / 7) + 0.4);
      else if (id.includes("alpstuga") && id.includes("luftfugtighed")) v = 42 + 5 * Math.sin((x / 9) + 1);
      else if (id.includes("alpstuga") && id.includes("pm25")) v = 4 + 2 * Math.sin((x / 5) + 2);
      else if (id.includes("alpstuga") && id.includes("temperatur_3")) v = 23.7 + 0.7 * Math.sin((x / 8) + 0.8);
      else if (id.includes("alpstuga") && id.includes("temperatur")) v = 24.0 + 0.9 * Math.sin((x / 8) + 0.5);
      else if (id.includes("timmerflotte") && id.includes("temperatur_2")) v = 22.7 + 0.5 * Math.sin((x / 9) + 0.3);
      else if (id.includes("timmerflotte") && id.includes("luftfugtighed_2")) v = 44 + 4 * Math.sin((x / 10) + 0.7);
      else if (id.includes("timmerflotte") && id.includes("temperatur")) v = 18.2 + 1.1 * Math.sin((x / 11) + 0.2);
      else if (id.includes("timmerflotte") && id.includes("luftfugtighed")) v = 62 + 5 * Math.sin((x / 12) + 0.4);
      else if (id.includes("outdoor_temperature")) v = 2.2 + 3 * Math.sin(((h - 6) / 24) * Math.PI * 2);
      else if (id.includes("pv_totalpower")) v = h < 7.5 || h > 15.8 ? 0 : Math.max(0, Math.sin(((h - 7.5) / 8.3) * Math.PI) * 2850);
      else if (id.includes("load_w_totalpower")) v = 560 + 240 * Math.sin((x / 5) + 0.4) + 80 * Math.sin(x / 1.7);
      else if (id.includes("pulse_batteri_effekt")) v = -320 + 120 * Math.sin((x / 6) + 0.8);
      else if (id.includes("grid_out_total_power")) v = -665 + 220 * Math.sin((x / 7) + 1.2);
      else if (id.includes("pv3_power")) v = h < 7.5 || h > 15.8 ? 0 : Math.max(0, Math.sin(((h - 7.5) / 8.3) * Math.PI) * 1700);
      else if (id.includes("pv4_power")) v = h < 7.5 || h > 15.8 ? 0 : Math.max(0, Math.sin(((h - 7.5) / 8.3) * Math.PI) * 1150);
      else if (id.includes("battery_soc")) v = 27 + 16 * Math.sin(((h - 2) / 24) * Math.PI * 2);
      else if (id.includes("battery_voltage")) v = 51 + 1.2 * Math.sin((x / 8));
      else if (id.includes("battery_charge")) v = 4.2 + 1.2 * Math.sin((x / 20));
      else if (id.includes("battery_discharge")) v = 3.1 + 0.9 * Math.sin((x / 18) + 1);
      else if (id.includes("daily_production")) v = (h / 24) * 15.2;
      else if (id.includes("grid_current_a_l1")) v = 1.0 + 0.5 * Math.sin((x / 3) + 0.2);
      else if (id.includes("grid_current_a_l2")) v = 2.3 + 0.6 * Math.sin((x / 4) + 1.4);
      else if (id.includes("grid_current_a_l3")) v = 0.9 + 0.4 * Math.sin((x / 5) + 2.2);
      else if (id.includes("1_1_1_1")) v = i % 7 === 0 ? null : 7.8 + 2.2 * Math.sin((x / 2) + 0.8);
      else if (id.includes("8_8_8_8")) v = 8 + 1.2 * Math.sin((x / 2.5) + 0.4);
      else if (id.includes("round_trip_time")) v = 0.35 + 0.05 * Math.sin((x / 2) + 0.1);
      else if (id.includes("bwt_perla_current_flow")) v = (i % 37 === 0 ? 0.28 : 0) + (i % 53 === 0 ? 0.12 : 0);
      else if (id.includes("40ndasdro56_kurs")) v = 96.8 + 0.9 * Math.sin((x / 30) + 0.4);
      else if (id.includes("sparet_solceller")) v = (i / n) * 998;
      else if (id.includes("sparet_batteri")) v = (i / n) * 544;
      else if (id.includes("sparet_total")) v = (i / n) * 1542;
      else if (id.includes("nilan602_actual_room_temperature")) v = 23.1 + 0.4 * Math.sin((x / 10) + 0.3);
      else if (id.includes("nilan602_humidity")) v = 38 + 4 * Math.sin((x / 12) + 0.2);
      else v = 50 + 10 * Math.sin((x / 10) + 1);
      if (v !== null) rows.push({ s: String(Math.round(v * 100) / 100), lu: t / 1000 });
    }
    out[id] = rows;
  }
  return out;
}

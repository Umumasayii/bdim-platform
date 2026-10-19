"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { COUNTRY_NAMES, OTHER, divisionLabel, divisionsOf, districtsOf, localLabel } from "@/lib/locations";

export interface LocationValue {
  country: string;
  province: string;
  city: string;
}

/**
 * Country → province (county / region / state) → district, as cascading
 * selects. Each list has "Other / not listed", which switches that level
 * (and the ones below it) to text boxes.
 */
export function LocationPicker({
  idPrefix,
  value,
  onChange,
  errors = {},
  required = false,
}: {
  idPrefix: string;
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  errors?: Partial<Record<keyof LocationValue, string>>;
  required?: boolean;
}) {
  const listed = (c: string) => COUNTRY_NAMES.includes(c);
  const [countryTyped, setCountryTyped] = useState(Boolean(value.country) && !listed(value.country));
  const [provinceTyped, setProvinceTyped] = useState(
    Boolean(value.province) && listed(value.country) && !divisionsOf(value.country).some((d) => d.name === value.province),
  );
  const [cityTyped, setCityTyped] = useState(Boolean(value.city) && !districtsOf(value.country, value.province).includes(value.city));

  const countryKnown = !countryTyped && listed(value.country);
  const provinces = countryKnown ? divisionsOf(value.country) : [];
  const provinceSelect = countryKnown && !provinceTyped;
  const districts = provinceSelect ? districtsOf(value.country, value.province) : [];
  const districtSelect = provinceSelect && districts.length > 0 && !cityTyped;
  const provLabel = countryKnown ? divisionLabel(value.country) : "Province, state or region";
  const cityLabel = countryKnown ? localLabel(value.country) : "City or town";

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Country" htmlFor={`${idPrefix}-country`} error={errors.country} required={required}>
          <Select
            id={`${idPrefix}-country`}
            autoComplete="country-name"
            value={countryTyped ? OTHER : value.country}
            aria-invalid={Boolean(errors.country)}
            onChange={(e) => {
              const v = e.target.value;
              setCountryTyped(v === OTHER);
              setProvinceTyped(false);
              setCityTyped(false);
              onChange({ country: v === OTHER ? "" : v, province: "", city: "" });
            }}
          >
            <option value="" disabled>
              Choose your country…
            </option>
            {COUNTRY_NAMES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value={OTHER}>Other country…</option>
          </Select>
        </Field>
        {countryTyped ? (
          <Field label="Your country" htmlFor={`${idPrefix}-country-text`} error={errors.country} required={required}>
            <Input
              id={`${idPrefix}-country-text`}
              value={value.country}
              maxLength={80}
              aria-invalid={Boolean(errors.country)}
              onChange={(e) => onChange({ ...value, country: e.target.value })}
            />
          </Field>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {provinceSelect ? (
          <Field label={provLabel} htmlFor={`${idPrefix}-province`} error={errors.province} required={required}>
            <Select
              id={`${idPrefix}-province`}
              value={value.province}
              aria-invalid={Boolean(errors.province)}
              onChange={(e) => {
                const v = e.target.value;
                setCityTyped(false);
                if (v === OTHER) {
                  setProvinceTyped(true);
                  onChange({ ...value, province: "", city: "" });
                } else {
                  onChange({ ...value, province: v, city: "" });
                }
              }}
            >
              <option value="" disabled>
                Choose…
              </option>
              {provinces.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
              <option value={OTHER}>Other / not listed…</option>
            </Select>
          </Field>
        ) : countryKnown || countryTyped ? (
          <Field label={provLabel} htmlFor={`${idPrefix}-province`} error={errors.province} required={required}>
            <Input
              id={`${idPrefix}-province`}
              value={value.province}
              maxLength={80}
              aria-invalid={Boolean(errors.province)}
              onChange={(e) => onChange({ ...value, province: e.target.value })}
            />
          </Field>
        ) : (
          <Field label="Province, state or region" htmlFor={`${idPrefix}-province`} error={errors.province} required={required}>
            <Select id={`${idPrefix}-province`} value="" disabled>
              <option value="">Choose a country first</option>
            </Select>
          </Field>
        )}

        {districtSelect ? (
          <Field label={cityLabel} htmlFor={`${idPrefix}-city`} error={errors.city} required={required}>
            <Select
              id={`${idPrefix}-city`}
              value={value.city}
              aria-invalid={Boolean(errors.city)}
              onChange={(e) => {
                const v = e.target.value;
                if (v === OTHER) {
                  setCityTyped(true);
                  onChange({ ...value, city: "" });
                } else {
                  onChange({ ...value, city: v });
                }
              }}
            >
              <option value="" disabled>
                Choose…
              </option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
              <option value={OTHER}>Other / not listed…</option>
            </Select>
          </Field>
        ) : provinceSelect && !value.province ? (
          <Field label={cityLabel} htmlFor={`${idPrefix}-city`} error={errors.city} required={required}>
            <Select id={`${idPrefix}-city`} value="" disabled>
              <option value="">Choose a {provLabel.toLowerCase()} first</option>
            </Select>
          </Field>
        ) : value.country || countryTyped ? (
          <Field label={cityLabel} htmlFor={`${idPrefix}-city`} error={errors.city} required={required}>
            <Input
              id={`${idPrefix}-city`}
              value={value.city}
              maxLength={80}
              autoComplete="address-level2"
              aria-invalid={Boolean(errors.city)}
              onChange={(e) => onChange({ ...value, city: e.target.value })}
            />
          </Field>
        ) : (
          <Field label="District or city" htmlFor={`${idPrefix}-city`} error={errors.city} required={required}>
            <Select id={`${idPrefix}-city`} value="" disabled>
              <option value="">Choose a country first</option>
            </Select>
          </Field>
        )}
      </div>
    </div>
  );
}

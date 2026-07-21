import React, {useEffect, useState} from "react";
import {useFieldArray, useForm, useWatch} from "react-hook-form";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button.tsx";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from "@/components/ui/form.tsx";
import {Input} from "@/components/ui/input.tsx";
import {MinusIcon, PlusIcon} from "@radix-ui/react-icons";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {Textarea} from "@/components/ui/textarea.tsx";
import api from "@/services/api.ts";
import {AffectedPersonSectionData} from "@/services/types.tsx";
import {toast} from "@/components/ui/use-toast.ts";
import {format} from "date-fns/format";
import {
  fetchAllDropdownsSpecificLanguage,
  ResponseDropdownField,
  SystemDropdowns,
  YesNoOptions
} from "@/services/DropdownUtil.tsx";
import {getCurrentLanguage} from "@/services/languageUtils.tsx";
import {differenceInYears, isBefore, subYears} from "date-fns";

interface AffectedPersonSectionParams {
  case_id: string
  setSaveAffectedPersonForm: (saveFunction: () => void) => void;
  setIsDirty: (isDirty: boolean) => void;
}

const AffectedPersonSection: React.FC<AffectedPersonSectionParams> = ({
                                                                        case_id,
                                                                        setSaveAffectedPersonForm,
                                                                        setIsDirty
                                                                      }) => {
  const form = useForm();
  const {t} = useTranslation();
  const {control, setValue, getValues, formState, reset} = form;
  const {isDirty} = formState;  // React Hook Form's dirty tracking

  const [optionsFetched, setOptionsFetched] = React.useState(false);
  const binaryOptions = YesNoOptions;
  const [cantonOptions, setCantonOptions] = useState<ResponseDropdownField[]>([]);
  const [countryOptions, setCountryOptions] = useState<ResponseDropdownField[]>([]);
  const [affectedCivilStatusOptions, setAffectedCivilStatusOptions] = useState<ResponseDropdownField[]>([]);
  const [affectedGenderOptions, setAffectedGenderOptions] = useState<ResponseDropdownField[]>([]);
  const [affectedResidencyStatusSwitzerlandOptions, setAffectedResidencyStatusSwitzerlandOptions] = useState<ResponseDropdownField[]>([]);
  const [affectedEthnicAffiliationOptions, setAffectedEthnicAffiliationOptions] = useState<ResponseDropdownField[]>([]);
  const [familyReligiousAffiliationOptions, setFamilyReligiousAffiliationOptions] = useState<ResponseDropdownField[]>([]);
  const [affectedInstabilityOptions, setAffectedInstabilityOptions] = useState<ResponseDropdownField[]>([]);
  const [affectedRiskOptions, setAffectedRiskOptions] = useState<ResponseDropdownField[]>([]);

  // Use useFieldArray to manage the arrays of dynamic form groups
  const {fields: affectedNameFields, append: appendAffectedName, remove: removeAffectedName} = useFieldArray({
    control: control,
    name: "affectedNameEntries"
  });

  const {
    fields: affectedDateOfBirthFields,
    append: appendAffectedDateOfBirth,
    remove: removeAffectedDateOfBirth
  } = useFieldArray({
    control: control,
    name: "affectedDateOfBirthEntries"
  });

  const {
    fields: affectedNationalityFields,
    append: appendAffectedNationality,
    remove: removeAffectedNationality
  } = useFieldArray({
    control: form.control,
    name: "affectedNationalityEntries"
  });

  const {
    fields: ethnicAffiliationFields,
    append: appendEthnicAffiliation,
    remove: removeEthnicAfiliation
  } = useFieldArray({
    control: control,
    name: "affectedEthnicAffiliationEntries"
  });

  const {fields: instabilityFields, append: appendInstability, remove: removeInstability} = useFieldArray({
    control: control,
    name: "affectedInstabilityEntries"
  });

  const {fields: riskFields, append: appendRisk, remove: removeRisk} = useFieldArray({
    control: control,
    name: "affectedRiskEntries"
  });

  const {fields: phoneNrFields, append: appendPhoneNr, remove: removePhoneNr} = useFieldArray({
    control: control,
    name: "affectedPhoneNrEntries"
  });

  const {fields: emailFields, append: appendEmail, remove: removeEmail} = useFieldArray({
    control: control,
    name: "affectedEmailEntries"
  });

  const handleSave = async () => {
    try {
      const formData = form.getValues();
      await api.put(`/affected-person-section/${case_id}/`, formData)
      reset(formData);
      setIsDirty(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("storeAffectedPersonSectionDataError"),
      })
    }
  }

  const affectedDateOfBirthFirstEntry = useWatch({
    control,
    name: 'affectedDateOfBirthEntries[0].dateOfBirth', // Watch the first entry's dateOfBirth
    defaultValue: "",
  });

  const affectedAge = getValues('affectedAge'); // Get the current value of the age field

  // Warn user when trying to leave the page if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    setIsDirty(isDirty);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, setIsDirty]);

  useEffect(() => {
    // Only recalculate the age if the first date of birth entry actually has a valid date
    if (affectedDateOfBirthFirstEntry && !affectedAge) {
      const birthDate = new Date(affectedDateOfBirthFirstEntry);

      // Check if the birthDate is valid
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let calculatedAge = differenceInYears(new Date(), birthDate);

        // Calculate age based on current day
        const birthdayThisYear = subYears(birthDate, calculatedAge);
        if (isBefore(today, birthdayThisYear)) {
          calculatedAge -= 1;
        }

        // Update the age field with the calculated age if it's empty
        setValue('affectedAge', calculatedAge.toString());
      }
    }
  }, [affectedDateOfBirthFirstEntry, affectedAge, setValue]);

  useEffect(() => {
    const fetchSectionCaseData = async () => {
      try {
        const response = await api.get(`/affected-person-section/${case_id}/`);
        const afftectedPersonSectionData: AffectedPersonSectionData = response.data;

        const language = getCurrentLanguage();
        const dropdownsData = await fetchAllDropdownsSpecificLanguage(language)

        const cantonData = dropdownsData[SystemDropdowns.CANTON]?.dropdownFields || [];
        const countryData = dropdownsData[SystemDropdowns.COUNTRY]?.dropdownFields || [];
        const affectedCivilStatusData = dropdownsData[SystemDropdowns.CIVIL_STATUS]?.dropdownFields || [];
        const affectedGenderData = dropdownsData[SystemDropdowns.GENDER]?.dropdownFields || [];
        const affectedResidencyStatusSwitzerlandData = dropdownsData[SystemDropdowns.RESIDENCY_STATUS_SWITZERLAND]?.dropdownFields || [];
        const affectedEthnicAffiliationData = dropdownsData[SystemDropdowns.ETHNICITY]?.dropdownFields || [];
        const familyReligiousAffiliationData = dropdownsData[SystemDropdowns.RELIGION]?.dropdownFields || [];
        const affectedInstabilityData = dropdownsData[SystemDropdowns.INSTABILITY]?.dropdownFields || [];
        const affectedRiskData = dropdownsData[SystemDropdowns.RISK]?.dropdownFields || [];

        setCantonOptions(cantonData);
        setCountryOptions(countryData);
        setAffectedCivilStatusOptions(affectedCivilStatusData);
        setAffectedGenderOptions(affectedGenderData);
        setAffectedResidencyStatusSwitzerlandOptions(affectedResidencyStatusSwitzerlandData);
        setAffectedEthnicAffiliationOptions(affectedEthnicAffiliationData);
        setFamilyReligiousAffiliationOptions(familyReligiousAffiliationData);
        setAffectedInstabilityOptions(affectedInstabilityData);
        setAffectedRiskOptions(affectedRiskData);

        setOptionsFetched(true);

        // Set values of dynamic fields in react useArrays
        setValue("affectedNameEntries", afftectedPersonSectionData.affectedNameEntries || []);
        setValue("affectedDateOfBirthEntries", afftectedPersonSectionData.affectedDateOfBirthEntries || []);
        setValue("affectedNationalityEntries", afftectedPersonSectionData.affectedNationalityEntries || []);
        setValue("affectedEthnicAffiliationEntries", afftectedPersonSectionData.affectedEthnicAffiliationEntries || []);
        setValue("affectedInstabilityEntries", afftectedPersonSectionData.affectedInstabilityEntries || []);
        setValue("affectedRiskEntries", afftectedPersonSectionData.affectedRiskEntries || []);
        setValue("affectedPhoneNrEntries", afftectedPersonSectionData.affectedPhoneNrEntries || []);
        setValue("affectedEmailEntries", afftectedPersonSectionData.affectedEmailEntries || []);

        // Set values of normal fields in form
        form.setValue("affectedCivilStatus", afftectedPersonSectionData.affectedCivilStatus || "");
        form.setValue("affectedCivilStatusInfo", afftectedPersonSectionData.affectedCivilStatusInfo || "");
        form.setValue("affectedGender", afftectedPersonSectionData.affectedGender || "");
        form.setValue("affectedGenderInfo", afftectedPersonSectionData.affectedGenderInfo || "");
        form.setValue("affectedAge", afftectedPersonSectionData.affectedAge || "");
        form.setValue("affectedEnteredSwitzerlandDate", afftectedPersonSectionData.affectedEnteredSwitzerlandDate || "");
        form.setValue("affectedEnteredSwitzerlandDateInfo", afftectedPersonSectionData.affectedEnteredSwitzerlandDateInfo || "");
        form.setValue("affectedCountryOfBirth", afftectedPersonSectionData.affectedCountryOfBirth || "");
        form.setValue("affectedChildhoodCountryOfResidence", afftectedPersonSectionData.affectedChildhoodCountryOfResidence || "");
        form.setValue("affectedChildhoodCountryOfResidenceInfo", afftectedPersonSectionData.affectedChildhoodCountryOfResidenceInfo || "")
        form.setValue("motherNationality", afftectedPersonSectionData.motherNationality || "")
        form.setValue("fatherNationality", afftectedPersonSectionData.fatherNationality || "")
        form.setValue("affectedResidencyStatusSwitzerland", afftectedPersonSectionData.affectedResidencyStatusSwitzerland || "")
        form.setValue("affectedResidencyStatusSwitzerlandInfo", afftectedPersonSectionData.affectedResidencyStatusSwitzerlandInfo || "")
        form.setValue("affectedAttitudeTowardsOrigin", afftectedPersonSectionData.affectedAttitudeTowardsOrigin || "")
        form.setValue("affectedReligiousAffiliationInfo", afftectedPersonSectionData.affectedReligiousAffiliationInfo || "")
        form.setValue("familyReligiousAffiliation", afftectedPersonSectionData.familyReligiousAffiliation || "")
        form.setValue("familyReligiousAffiliationInfo", afftectedPersonSectionData.familyReligiousAffiliationInfo || "")
        form.setValue("affectedPassportCopy", afftectedPersonSectionData.affectedPassportCopy || "")
        form.setValue("affectedPassportCopyInfo", afftectedPersonSectionData.affectedPassportCopyInfo || "")
        form.setValue("affectedPowerOfAttorney", afftectedPersonSectionData.affectedPowerOfAttorney || "")
        form.setValue("affectedPowerOfAttorneyInfo", afftectedPersonSectionData.affectedPowerOfAttorneyInfo || "")
        form.setValue("affectedAffidavit", afftectedPersonSectionData.affectedAffidavit || "")
        form.setValue("affectedAffidavitInfo", afftectedPersonSectionData.affectedAffidavitInfo || "")
        form.setValue("affectedKnownImpairment", afftectedPersonSectionData.affectedKnownImpairment || "")
        form.setValue("affectedKnownImpairmentInfo", afftectedPersonSectionData.affectedKnownImpairmentInfo || "")
        form.setValue("affectedCustodianship", afftectedPersonSectionData.affectedCustodianship || "")
        form.setValue("affectedCustodianshipInfo", afftectedPersonSectionData.affectedCustodianshipInfo || "")
        form.setValue("affectedCanton", afftectedPersonSectionData.affectedCanton || "")
        form.setValue("affectedCantonInfo", afftectedPersonSectionData.affectedCantonInfo || "")
        form.setValue("affectedAddress", afftectedPersonSectionData.affectedAddress || "")
      } catch (error) {
        toast({
          variant: "destructive",
          title: t("error"),
          description: t("fetchAffectedPersonSectionDataError"),
        })
      }
    };

    fetchSectionCaseData();

    setSaveAffectedPersonForm(() => handleSave);
  }, [case_id, setSaveAffectedPersonForm, form, setValue]);

  return (
    <div className="mt-4">
      <Form {...form}>
        <form className="grid gap-4">
          {optionsFetched ? (
            <>
              {/*first row of section*/}
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2">
                {/* dynamic name */}
                <div className="col-span-2 grid gap-2">
                  {affectedNameFields.map((item, index) => (
                    <div key={item.id} className="flex items-end space-x-2">
                      <FormField
                        control={form.control}
                        name={`affectedNameEntries[${index}].name1`}
                        render={({field}) => (
                          <FormItem className="w-full">
                            {index === 0 && <FormLabel>{t("name")}</FormLabel>}
                            <FormControl>
                              <Input type="text" {...field} />
                            </FormControl>
                            <FormMessage/>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`affectedNameEntries[${index}].name2`}
                        render={({field}) => (
                          <FormItem className="w-full">
                            <FormControl>
                              <Input type="text" {...field} />
                            </FormControl>
                            <FormMessage/>
                          </FormItem>
                        )}
                      />
                      <div className="flex mb-1.5">
                        <Button
                          variant="outline"
                          className="p-2 w-7 h-7 rounded-full flex items-center justify-center"
                          type="button"
                          disabled={affectedNameFields.length === 1}
                          onClick={() => removeAffectedName(index)}
                        >
                          <MinusIcon className="w-4 h-4 text-gray-500"/>
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    className="p-2 w-7 h-7 rounded-full flex items-center justify-center"
                    type="button"
                    onClick={() => appendAffectedName({})}
                  >
                    <PlusIcon className="w-4 h-4"/>
                  </Button>
                </div>
                {/* zivilstand */}
                <FormField
                  control={form.control}
                  name="affectedCivilStatus"
                  render={({field}) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{t("affectedCivilStatus")}</FormLabel>
                      <FormControl>
                        <div className="flex space-x-2">
                          <Select onValueChange={(val) => field.onChange(val === "__clear__" ? null : val)} value={field.value?.toString() ?? ""}>
                            <SelectTrigger>
                              <SelectValue placeholder=""/>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__clear__">-- Clear selection --</SelectItem>
                              {affectedCivilStatusOptions.map((option) => (
                                <SelectItem key={option?.dropdownFieldId} value={option?.dropdownFieldId.toString()}>
                                  {option?.dropdownFieldName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input type="text"
                                 {...form.register("affectedCivilStatusInfo")}
                          />
                        </div>
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
                {/* geschlecht */}
                <FormField
                  control={form.control}
                  name="affectedGender"
                  render={({field}) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{t("affectedGender")}</FormLabel>
                      <FormControl>
                        <div className="flex space-x-2">
                          <Select onValueChange={(val) => field.onChange(val === "__clear__" ? null : val)} value={field.value?.toString() ?? ""}>
                            <SelectTrigger>
                              <SelectValue placeholder=""/>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__clear__">-- Clear selection --</SelectItem>
                              {affectedGenderOptions.map((option) => (
                                <SelectItem key={option?.dropdownFieldId} value={option?.dropdownFieldId.toString()}>
                                  {option?.dropdownFieldName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input type="text"
                                 {...form.register("affectedGenderInfo")}
                          />
                        </div>
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
              </div>

              {/*second row of section*/}
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2">
                {/* Dynamic betroffene geburtsdatum */}
                <div className="col-span-1 grid gap-2">
                  {affectedDateOfBirthFields.map((item, index) => (
                    <div key={item.id} className="flex items-end space-x-2">
                      <FormField
                        control={form.control}
                        name={`affectedDateOfBirthEntries[${index}].dateOfBirth`}
                        render={({field}) => (
                          <FormItem className="w-full">
                            {index === 0 && <FormLabel>{t("dateOfBirth")}</FormLabel>}
                            <FormControl>
                              <Input
                                type="date"
                                value={field.value ? format(new Date(field.value), "yyyy-MM-dd") : ""}
                                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : "")}
                              />
                            </FormControl>
                            <FormMessage/>
                          </FormItem>
                        )}
                      />
                      <div className="flex mb-1.5">
                        <Button
                          variant="outline"
                          className="p-2 w-7 h-7 rounded-full flex items-center justify-center"
                          type="button"
                          disabled={affectedDateOfBirthFields.length === 1}
                          onClick={() => removeAffectedDateOfBirth(index)}
                        >
                          <MinusIcon className="w-4 h-4 text-gray-500"/>
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    className="p-2 w-7 h-7 rounded-full flex items-center justify-center"
                    type="button"
                    onClick={() => appendAffectedDateOfBirth({})}
                  >
                    <PlusIcon className="w-4 h-4"/>
                  </Button>
                </div>
                {/* betroffene alter */}
                <FormField
                  control={form.control}
                  name="affectedAge"
                  render={({field}) => (
                    <FormItem className="col-span-1">
                      <FormLabel>{t("affectedAge")}</FormLabel>
                      <FormControl>
                        <Input type="text" {...field} />
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
                {/* betroffene einreisedatum schweiz */}
                <FormField
                  control={form.control}
                  name="affectedEnteredSwitzerlandDate"
                  render={({field}) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{t("affectedEnteredSwitzerlandDate")}</FormLabel>
                      <FormControl>
                        <div className="flex space-x-2">
                          <Input
                            type="date"
                            value={field.value ? format(new Date(field.value), "yyyy-MM-dd") : ""}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : "")}
                          />
                          <Input type="text"
                                 {...form.register("affectedEnteredSwitzerlandDateInfo")}
                          />
                        </div>
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
              </div>

              {/*third row of section*/}
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2">
                {/* Dynamic betroffene staatsangehörigkeit*/}
                <div className="col-span-1 grid gap-2">
                  {affectedNationalityFields.map((item, index) => (
                    <div key={item.id} className="flex items-end space-x-2">
                      <FormField
                        control={form.control}
                        name={`affectedNationalityEntries[${index}].nationality`}
                        render={({field}) => (
                          <FormItem className="w-full">
                            {index === 0 && <FormLabel>{t("nationality")}</FormLabel>}
                            <FormControl>
                              <Select onValueChange={(val) => field.onChange(val === "__clear__" ? null : val)} value={field.value?.toString() ?? ""}>
                                <SelectTrigger>
                                  <SelectValue placeholder=""/>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__clear__">-- Clear selection --</SelectItem>
                                  {countryOptions.map((option) => (
                                    <SelectItem key={option?.dropdownFieldId}
                                                value={option?.dropdownFieldId.toString()}>
                                      {option?.dropdownFieldName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage/>
                          </FormItem>
                        )}
                      />
                      <div className="flex mb-1.5">
                        <Button
                          variant="outline"
                          className="p-2 w-7 h-7 rounded-full flex items-center justify-center"
                          type="button"
                          disabled={affectedNationalityFields.length === 1}
                          onClick={() => removeAffectedNationality(index)}
                        >
                          <MinusIcon className="w-4 h-4 text-gray-500"/>
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    className="p-2 w-7 h-7 rounded-full flex items-center justify-center"
                    type="button"
                    onClick={() => appendAffectedNationality({})}
                  >
                    <PlusIcon className="w-4 h-4"/>
                  </Button>
                </div>
                {/* betroffene geburtsland*/}
                <FormField
                  control={form.control}
                  name="affectedCountryOfBirth"
                  render={({field}) => (
                    <FormItem className="col-span-1">
                      <FormLabel>{t("affectedCountryOfBirth")}</FormLabel>
                      <FormControl>
                        <Select onValueChange={(val) => field.onChange(val === "__clear__" ? null : val)} value={field.value?.toString() ?? ""}>
                          <SelectTrigger>
                            <SelectValue placeholder=""/>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__clear__">-- Clear selection --</SelectItem>
                            {countryOptions.map((option) => (
                              <SelectItem key={option?.dropdownFieldId} value={option?.dropdownFieldId.toString()}>
                                {option?.dropdownFieldName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
                {/* betroffene wohnland kindheit */}
                <FormField
                  control={form.control}
                  name="affectedChildhoodCountryOfResidence"
                  render={({field}) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{t("affectedChildhoodCountryOfResidence")}</FormLabel>
                      <FormControl>
                        <div className="flex space-x-2">
                          <Select onValueChange={(val) => field.onChange(val === "__clear__" ? null : val)} value={field.value?.toString() ?? ""}>
                            <SelectTrigger>
                              <SelectValue placeholder=""/>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__clear__">-- Clear selection --</SelectItem>
                              {countryOptions.map((option) => (
                                <SelectItem key={option?.dropdownFieldId} value={option?.dropdownFieldId.toString()}>
                                  {option?.dropdownFieldName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input type="text"
                                 {...form.register("affectedChildhoodCountryOfResidenceInfo")}
                          />
                        </div>
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
                {/* mutter staatsangehörigkeit */}
                <FormField
                  control={form.control}
                  name="motherNationality"
                  render={({field}) => (
                    <FormItem className="col-span-1">
                      <FormLabel>{t("motherNationality")}</FormLabel>
                      <FormControl>
                        <Select onValueChange={(val) => field.onChange(val === "__clear__" ? null : val)} value={field.value?.toString() ?? ""}>
                          <SelectTrigger>
                            <SelectValue placeholder=""/>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__clear__">-- Clear selection --</SelectItem>
                            {countryOptions.map((option) => (
                              <SelectItem key={option?.dropdownFieldId} value={option?.dropdownFieldId.toString()}>
                                {option?.dropdownFieldName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
                {/* vater staatsangehörigkeit */}
                <FormField
                  control={form.control}
                  name="fatherNationality"
                  render={({field}) => (
                    <FormItem className="col-span-1">
                      <FormLabel>{t("fatherNationality")}</FormLabel>
                      <FormControl>
                        <Select onValueChange={(val) => field.onChange(val === "__clear__" ? null : val)} value={field.value?.toString() ?? ""}>
                          <SelectTrigger>
                            <SelectValue placeholder=""/>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__clear__">-- Clear selection --</SelectItem>
                            {countryOptions.map((option) => (
                              <SelectItem key={option?.dropdownFieldId} value={option?.dropdownFieldId.toString()}>
                                {option?.dropdownFieldName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
              </div>

              {/*fourth row of section*/}
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2">
                {/* aufenthaltsstatus schweiz */}
                <FormField
                  control={form.control}
                  name="affectedResidencyStatusSwitzerland"
                  render={({field}) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{t("affectedResidencyStatusSwitzerland")}</FormLabel>
                      <FormControl>
                        <div className="flex space-x-2">
                          <Select onValueChange={(val) => field.onChange(val === "__clear__" ? null : val)} value={field.value?.toString() ?? ""}>
                            <SelectTrigger>
                              <SelectValue placeholder=""/>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__clear__">-- Clear selection --</SelectItem>
                              {affectedResidencyStatusSwitzerlandOptions.map((option) => (
                                <SelectItem key={option?.dropdownFieldId} value={option?.dropdownFieldId.toString()}>
                                  {option?.dropdownFieldName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input type="text"
                                 {...form.register("affectedResidencyStatusSwitzerlandInfo")}
                          />
                        </div>
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
                {/*dynamic ethnische zugehörigkeit */}
                <div className="col-span-2 grid gap-2">
                  {ethnicAffiliationFields.map((item, index) => (
                    <div key={item.id} className="flex items-end space-x-2">
                      <FormField
                        control={form.control}
                        name={`affectedEthnicAffiliationEntries[${index}].affectedEthnicAffiliation`}
                        render={({field}) => (
                          <FormItem className="w-full">
                            {index === 0 && <FormLabel>{t("affectedEthnicAffiliation")}</FormLabel>}
                            <FormControl>
                              <div className="flex space-x-2">
                                <Select onValueChange={(val) => field.onChange(val === "__clear__" ? null : val)} value={field.value?.toString() ?? ""}>
                                  <SelectTrigger>
                                    <SelectValue placeholder=""/>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__clear__">-- Clear selection --</SelectItem>
                                    {affectedEthnicAffiliationOptions.map((option) => (
                                      <SelectItem key={option?.dropdownFieldId}
                                                  value={option?.dropdownFieldId.toString()}>
                                        {option?.dropdownFieldName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </FormControl>
                            <FormMessage/>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`affectedEthnicAffiliationEntries[${index}].affectedEthnicAffiliationInfo`}
                        render={({field}) => (
                          <FormItem className="w-full">
                            <FormControl>
                              <Input type="text" {...field} />
                            </FormControl>
                            <FormMessage/>
                          </FormItem>
                        )}
                      />
                      <div className="flex mb-1.5">
                        <Button
                          variant="outline"
                          className="p-2 w-7 h-7 rounded-full flex items-center justify-center"
                          type="button"
                          disabled={ethnicAffiliationFields.length === 1}
                          onClick={() => removeEthnicAfiliation(index)}
                        >
                          <MinusIcon className="w-4 h-4 text-gray-500"/>
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    className="p-2 w-7 h-7 rounded-full flex items-center justify-center"
                    type="button"
                    onClick={() => appendEthnicAffiliation({})}
                  >
                    <PlusIcon className="w-4 h-4"/>
                  </Button>
                </div>
                <FormField
                  control={form.control}
                  name="affectedAttitudeTowardsOrigin"
                  render={({field}) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{t("affectedAttitudeTowardsOrigin")}</FormLabel>
                      <FormControl>
                        <Input type="text"
                               {...field}
                        />
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
              </div>

              {/*fifth row of section*/}
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2">
                {/* familie relionszugehörigkeit */}
                <FormField
                  control={form.control}
                  name="familyReligiousAffiliation"
                  render={({field}) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{t("familyReligiousAffiliation")}</FormLabel>
                      <FormControl>
                        <div className="flex space-x-2">
                          <Select onValueChange={(val) => field.onChange(val === "__clear__" ? null : val)} value={field.value?.toString() ?? ""}>
                            <SelectTrigger>
                              <SelectValue placeholder=""/>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__clear__">-- Clear selection --</SelectItem>
                              {familyReligiousAffiliationOptions.map((option) => (
                                <SelectItem key={option?.dropdownFieldId} value={option?.dropdownFieldId.toString()}>
                                  {option?.dropdownFieldName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input type="text"
                                 {...form.register("familyReligiousAffiliationInfo")}
                          />
                        </div>
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="affectedReligiousAffiliationInfo"
                  render={({field}) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{t("affectedReligiousAffiliationInfo")}</FormLabel>
                      <FormControl>
                        <Input type="text"
                               {...field}
                        />
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
              </div>

              {/*sixth row of section*/}
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2">
                {/* betroffene ausweiskopie */}
                <FormField
                  control={form.control}
                  name="affectedPassportCopy"
                  render={({field}) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{t("affectedPassportCopy")}</FormLabel>
                      <FormControl>
                        <div className="flex space-x-2">
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder=""/>
                            </SelectTrigger>
                            <SelectContent>
                              {binaryOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {t(option)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input type="text"
                                 {...form.register("affectedPassportCopyInfo")}
                          />
                        </div>
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
                {/* betroffene vollmacht */}
                <FormField
                  control={form.control}
                  name="affectedPowerOfAttorney"
                  render={({field}) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{t("affectedPowerOfAttorney")}</FormLabel>
                      <FormControl>
                        <div className="flex space-x-2">
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder=""/>
                            </SelectTrigger>
                            <SelectContent>
                              {binaryOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {t(option)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input type="text"
                                 {...form.register("affectedPowerOfAttorneyInfo")}
                          />
                        </div>
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
                {/* betroffene eidesstattliche erklärung */}
                <FormField
                  control={form.control}
                  name="affectedAffidavit"
                  render={({field}) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{t("affectedAffidavit")}</FormLabel>
                      <FormControl>
                        <div className="flex space-x-2">
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder=""/>
                            </SelectTrigger>
                            <SelectContent>
                              {binaryOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {t(option)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input type="text"
                                 {...form.register("affectedAffidavitInfo")}
                          />
                        </div>
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
              </div>

              {/*seventh row of section*/}
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2 items-start">
                {/* dynamic labilität */}
                <div className="col-span-2 grid gap-2">
                  {instabilityFields.map((item, index) => (
                    <div key={item.id} className="flex items-end space-x-2">
                      <FormField
                        control={form.control}
                        name={`affectedInstabilityEntries[${index}].instability`}
                        render={({field}) => (
                          <FormItem className="w-full">
                            {index === 0 && <FormLabel>{t("instability")}</FormLabel>}
                            <FormControl>
                              <div className="flex space-x-2">
                                <Select onValueChange={(val) => field.onChange(val === "__clear__" ? null : val)} value={field.value?.toString() ?? ""}>
                                  <SelectTrigger>
                                    <SelectValue placeholder=""/>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__clear__">-- Clear selection --</SelectItem>
                                    {affectedInstabilityOptions.map((option) => (
                                      <SelectItem key={option?.dropdownFieldId}
                                                  value={option?.dropdownFieldId.toString()}>
                                        {option?.dropdownFieldName}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </FormControl>
                            <FormMessage/>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`affectedInstabilityEntries[${index}].instability_date`}
                        render={({field}) => (
                          <FormItem className="w-full">
                            <FormControl>
                              <Input
                                type="date"
                                value={field.value ? format(new Date(field.value), "yyyy-MM-dd") : ""}
                                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : "")}
                              />
                            </FormControl>
                            <FormMessage/>
                          </FormItem>
                        )}
                      />
                      <div className="flex mb-1.5">
                        <Button
                          variant="outline"
                          className="p-2 w-7 h-7 rounded-full flex items-center justify-center"
                          type="button"
                          disabled={instabilityFields.length === 1}
                          onClick={() => removeInstability(index)}
                        >
                          <MinusIcon className="w-4 h-4 text-gray-500"/>
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    className="p-2 w-7 h-7 rounded-full flex items-center justify-center"
                    type="button"
                    onClick={() => appendInstability({})}
                  >
                    <PlusIcon className="w-4 h-4"/>
                  </Button>
                </div>
                {/* dynamic gefährdung */}
                <div className="col-span-2 grid gap-2">
                  {riskFields.map((item, index) => (
                    <div key={item.id} className="flex items-end space-x-2">
                      <FormField
                        control={form.control}
                        name={`affectedRiskEntries[${index}].risk`}
                        render={({field}) => (
                          <FormItem className="w-full">
                            {index === 0 && <FormLabel>{t("risk")}</FormLabel>}
                            <FormControl>
                              <Select onValueChange={(val) => field.onChange(val === "__clear__" ? null : val)} value={field.value?.toString() ?? ""}>
                                <SelectTrigger>
                                  <SelectValue placeholder=""/>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__clear__">-- Clear selection --</SelectItem>
                                  {affectedRiskOptions.map((option) => (
                                    <SelectItem key={option?.dropdownFieldId}
                                                value={option?.dropdownFieldId.toString()}>
                                      {option?.dropdownFieldName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage/>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`affectedRiskEntries[${index}].risk_date`}
                        render={({field}) => (
                          <FormItem className="w-full">
                            <FormControl>
                              <Input
                                type="date"
                                value={field.value ? format(new Date(field.value), "yyyy-MM-dd") : ""}
                                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : "")}
                              />
                            </FormControl>
                            <FormMessage/>
                          </FormItem>
                        )}
                      />
                      <div className="flex mb-1.5">
                        <Button
                          variant="outline"
                          className="p-2 w-7 h-7 rounded-full flex items-center justify-center"
                          type="button"
                          disabled={riskFields.length === 1}
                          onClick={() => removeRisk(index)}
                        >
                          <MinusIcon className="w-4 h-4 text-gray-500"/>
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    className="p-2 w-7 h-7 rounded-full flex items-center justify-center"
                    type="button"
                    onClick={() => appendRisk({})}
                  >
                    <PlusIcon className="w-4 h-4"/>
                  </Button>
                </div>
                {/* beeinträchtigung */}
                <FormField
                  control={form.control}
                  name="affectedKnownImpairment"
                  render={({field}) => (
                    <FormItem className="col-span-1">
                      <FormLabel>{t("affectedKnownImpairment")}</FormLabel>
                      <FormControl>
                        <div className="flex space-x-2">
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder=""/>
                            </SelectTrigger>
                            <SelectContent>
                              {binaryOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {t(option)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input type="text"
                                 {...form.register("affectedKnownImpairmentInfo")}
                          />
                        </div>
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
                {/* beistandschaft */}
                <FormField
                  control={form.control}
                  name="affectedCustodianship"
                  render={({field}) => (
                    <FormItem className="col-span-1">
                      <FormLabel>{t("affectedCustodianship")}</FormLabel>
                      <FormControl>
                        <div className="flex space-x-2">
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder=""/>
                            </SelectTrigger>
                            <SelectContent>
                              {binaryOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {t(option)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input type="text"
                                 {...form.register("affectedCustodianshipInfo")}
                          />
                        </div>
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
              </div>

              {/*eighth row of section*/}
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2 items-start">
                {/*dynamic telefon nr */}
                <div className="col-span-2 grid gap-2">
                  {phoneNrFields.map((item, index) => (
                    <div key={item.id} className="flex items-end space-x-2">
                      <FormField
                        control={form.control}
                        name={`affectedPhoneNrEntries[${index}].phoneNr1`}
                        render={({field}) => (
                          <FormItem className="w-full">
                            {index === 0 && <FormLabel>{t("phoneNr1")}</FormLabel>}
                            <FormControl>
                              <div className="flex space-x-2">
                                <Input type="text" {...field}/>
                              </div>
                            </FormControl>
                            <FormMessage/>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`affectedPhoneNrEntries[${index}].phoneNr2`}
                        render={({field}) => (
                          <FormItem className="w-full">
                            <FormControl>
                              <div className="flex space-x-2">
                                <Input type="text" {...field}/>
                              </div>
                            </FormControl>
                            <FormMessage/>
                          </FormItem>
                        )}
                      />
                      <div className="flex mb-1.5">
                        <Button
                          variant="outline"
                          className="p-2 w-7 h-7 rounded-full flex items-center justify-center"
                          type="button"
                          disabled={phoneNrFields.length === 1}

                          onClick={() => removePhoneNr(index)}
                        >
                          <MinusIcon className="w-4 h-4 text-gray-500"/>
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    className="p-2 w-7 h-7 rounded-full flex items-center justify-center"
                    type="button"
                    onClick={() => appendPhoneNr({})}
                  >
                    <PlusIcon className="w-4 h-4"/>
                  </Button>
                </div>
                {/*dynamic email */}
                <div className="col-span-2 grid gap-2">
                  {emailFields.map((item, index) => (
                    <div key={item.id} className="flex items-end space-x-2">
                      <FormField
                        control={form.control}
                        name={`affectedEmailEntries[${index}].email1`}
                        render={({field}) => (
                          <FormItem className="w-full">
                            {index === 0 && <FormLabel>{t("email1")}</FormLabel>}
                            <FormControl>
                              <div className="flex space-x-2">
                                <Input type="text" {...field}/>
                              </div>
                            </FormControl>
                            <FormMessage/>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`affectedEmailEntries[${index}].email2`}
                        render={({field}) => (
                          <FormItem className="w-full">
                            <FormControl>
                              <div className="flex space-x-2">
                                <Input type="text" {...field}/>
                              </div>
                            </FormControl>
                            <FormMessage/>
                          </FormItem>
                        )}
                      />
                      <div className="flex mb-1.5">
                        <Button
                          variant="outline"
                          className="p-2 w-7 h-7 rounded-full flex items-center justify-center"
                          type="button"
                          disabled={emailFields.length === 1}
                          onClick={() => removeEmail(index)}
                        >
                          <MinusIcon className="w-4 h-4 text-gray-500"/>
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    className="p-2 w-7 h-7 rounded-full flex items-center justify-center"
                    type="button"
                    onClick={() => appendEmail({})}
                  >
                    <PlusIcon className="w-4 h-4"/>
                  </Button>
                </div>
                {/* kanton */}
                <FormField
                  control={form.control}
                  name="affectedCanton"
                  render={({field}) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{t("affectedCanton")}</FormLabel>
                      <FormControl>
                        <div className="flex space-x-2">
                          <Select onValueChange={(val) => field.onChange(val === "__clear__" ? null : val)} value={field.value?.toString() ?? ""}>
                            <SelectTrigger>
                              <SelectValue placeholder=""/>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__clear__">-- Clear selection --</SelectItem>
                              {cantonOptions.map((option) => (
                                <SelectItem key={option?.dropdownFieldId} value={option?.dropdownFieldId.toString()}>
                                  {option?.dropdownFieldName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input type="text"
                                 {...form.register("affectedCantonInfo")}
                          />
                        </div>
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
              </div>

              {/*ninth row of section*/}
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2">
                {/* adresse */}
                <FormField
                  control={form.control}
                  name="affectedAddress"
                  render={({field}) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{t("affectedAddress")}</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage/>
                    </FormItem>
                  )}
                />
              </div>
            </>
          ) : (
            <p>{t("loadingOptions")}</p>
          )}
        </form>
      </Form>
    </div>
  );
}

export default AffectedPersonSection;
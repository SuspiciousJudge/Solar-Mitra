import type { ProviderApplication } from '../types/provider';
import { computeCompleteness, type CompletenessInput } from '../validators/providerRules';

export function toCompletenessInput(application: ProviderApplication): CompletenessInput {
  return {
    business: {
      legalName: application.businessDetails.legalName,
      businessType: application.businessDetails.businessType,
      principals: application.businessDetails.principals,
      yearEstablished: application.businessDetails.yearEstablished,
      registeredAddress: application.businessDetails.registeredAddress,
      companyEmail: application.businessDetails.companyEmail,
    },
    statutory: application.statutory,
    credentials: {
      electricalLicenceNo: application.credentials.electricalLicenceNo,
      electricalLicenceAuthority: application.credentials.electricalLicenceAuthority,
      electricalLicenceValidTill: application.credentials.electricalLicenceValidTill,
      discomEmpanelled: application.credentials.discomEmpanelled,
    },
    experience: {
      yearsExperience: application.experience.yearsExperience,
      totalInstallations: application.experience.totalInstallations,
      totalCapacityKw: application.experience.totalCapacityKw,
      engineers: application.experience.engineers,
      certifiedElectricians: application.experience.certifiedElectricians,
      installers: application.experience.installers,
      capacityPerMonth: application.experience.capacityPerMonth,
      workmanshipWarrantyYears: application.experience.workmanshipWarrantyYears,
      references: application.experience.references,
    },
    serviceArea: {
      states: application.serviceArea.states,
      districtsByState: application.serviceArea.districtsByState,
    },
    bank: {
      accountHolderName: application.bank.accountHolderName,
      accountNumberLast4: application.bank.accountNumberLast4,
      ifsc: application.bank.ifsc,
      accountType: application.bank.accountType,
    },
    contact: application.contact,
    declarations: application.declarations,
    documentTypes: application.documents.map((document) => document.type),
  };
}

export function completenessOf(application: ProviderApplication) {
  return computeCompleteness(toCompletenessInput(application));
}

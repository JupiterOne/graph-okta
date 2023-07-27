import * as lodash from 'lodash';
import * as url from 'url';

import { createIntegrationEntity } from '@jupiterone/integration-sdk-core';

import { OktaApplication } from '../../okta/types';
import { Entities } from '../../steps/constants';
import {
  OktaIntegrationConfig,
  StandardizedOktaApplication,
} from '../../types';
import buildAppShortName from '../../util/buildAppShortName';
import getOktaAccountAdminUrl from '../../util/getOktaAccountAdminUrl';
import getOktaAccountInfo from '../../util/getOktaAccountInfo';
import {
  getAccountName,
  getVendorName,
  isMultiInstanceApp,
} from '../../util/knownVendors';

interface IntegrationInstance {
  id: string;
  name: string;
  config: object;
}

export function getDisplayName(data: OktaApplication): string {
  return data.label || data.name || data.id;
}

export function getName(data: OktaApplication): string {
  return data.name || data.label;
}

export function isActive(data: OktaApplication): boolean {
  return data.status === 'ACTIVE';
}

export function isSAMLApp(data: OktaApplication): boolean {
  return !!data.signOnMode && data.signOnMode.startsWith('SAML');
}

export function getEnvSpecificProps(data: OktaApplication) {
  const appSettings = data.settings && data.settings.app;
  if (appSettings) {
    if (appSettings.awsEnvironmentType === 'aws.amazon') {
      const awsProps: any = {};

      if (appSettings.identityProviderArn) {
        const awsAccountIdMatch = /^arn:aws:iam::([0-9]+):/.exec(
          appSettings.identityProviderArn,
        );
        if (awsAccountIdMatch) {
          awsProps.awsAccountId = awsAccountIdMatch[1];
          awsProps.appAccountId = awsAccountIdMatch[1];
        }
      }

      return {
        ...awsProps,
        awsIdentityProviderArn: appSettings.identityProviderArn,
        awsEnvironmentType: appSettings.awsEnvironmentType,
        awsGroupFilter: appSettings.groupFilter,
        awsRoleValuePattern: appSettings.roleValuePattern,
        awsJoinAllRoles: appSettings.joinAllRoles,
        awsSessionDuration: appSettings.sessionDuration,
      };
    } else if (appSettings.githubOrg) {
      return {
        githubOrg: appSettings.githubOrg,
        appAccountId: appSettings.githubOrg,
      };
    } else if (appSettings.domain) {
      // Google Cloud Platform and G Suite apps use `domain` as the account identifier
      return {
        appDomain: appSettings.domain,
        appAccountId: appSettings.domain,
      };
    }
  }

  return {};
}

export function createApplicationEntity(
  instance: IntegrationInstance,
  data: OktaApplication,
): StandardizedOktaApplication {
  const webLink = url.resolve(
    getOktaAccountAdminUrl(instance.config as OktaIntegrationConfig),
    `/admin/app/${data.name}/instance/${data.id}`,
  );

  let imageUrl;
  let loginUrl;

  if (data._links?.logo) {
    imageUrl = lodash.flatten([data._links.logo])[0].href;
  }

  if (data._links?.appLinks) {
    const links = lodash.flatten([data._links.appLinks]);
    const link = links.find((l) => l.name === 'login') || links[0];
    loginUrl = link && link.href;
  }

  const oktaAccountInfo = getOktaAccountInfo(instance);
  const appShortName = buildAppShortName(oktaAccountInfo, data.name);

  const source = { ...data };
  delete source.credentials; //some OAuth config options stored here

  const entity = createIntegrationEntity({
    entityData: {
      source,
      assign: {
        _key: data.id,
        _type: Entities.APPLICATION._type,
        _class: Entities.APPLICATION._class,
        displayName: getDisplayName(data),
        id: data.id,
        name: getName(data),
        shortName: appShortName,
        label: data.label,
        status: data.status.toLowerCase(),
        active: isActive(data),
        lastUpdated: data.lastUpdated,
        created: data.created,
        features: data.features,
        signOnMode: data.signOnMode,
        appVendorName: getVendorName(appShortName),
        appAccountType: getAccountName(appShortName),
        isMultiInstanceApp: isMultiInstanceApp(appShortName),
        isSAMLApp: isSAMLApp(data),
        webLink,
        imageUrl,
        loginUrl,
      },
    },
  }) as StandardizedOktaApplication;

  const environmentSpecificProps = getEnvSpecificProps(data);

  return { ...entity, ...environmentSpecificProps };
}

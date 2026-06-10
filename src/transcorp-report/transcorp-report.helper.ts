import * as levenshtein from 'fast-levenshtein';
const moment = require('moment');

function calculateSimilarity(a: string, b: string): number {
  const first = a || '';
  const second = b || '';

  const distance = levenshtein.get(first, second);

  const maxLength = Math.max(first.length, second.length);

  if (maxLength === 0) {
    return 1;
  }

  return 1 - distance / maxLength;
}

export function groupObjectsByAddressSimilarity(
  objects: any[],
  threshold = 0.9,
  phase?: string,
  deliveryOwn?: string,
) {
  const groups: any[][] = [];
  const csvPayload: any[] = [];

  objects.forEach((obj) => {
    const address = obj?.address || '';
    let grouped = false;

    if (deliveryOwn !== 'Delivery') {
      obj.package_details = 'LAST MEAL BAG COLLECTION ONLY';
      obj.delivery_notes = 'LAST MEAL BAG COLLECTION ONLY';
    }

    for (const group of groups) {
      const representative = group?.[0]?.address || '';

      const similarity = calculateSimilarity(representative, address);

      if (similarity >= threshold) {
        group.push({
          ...obj,
          is_checked: false,
          sms: 'TRUE',
        });

        grouped = true;
        break;
      }
    }

    if (!grouped) {
      groups.push([
        {
          ...obj,
          is_checked: false,
        },
      ]);
    }
  });

  groups.forEach((list) => {
    list.forEach((itm) => {
      const customerOrderNo = itm?.order_number || '';

      let splitInternalCode = itm?.internal_code?.split(' & ');

      splitInternalCode = splitInternalCode?.map((spl: string) => {
        if (
          (itm?.bag_type === 'Styrofoam Box' ||
            itm?.bag_type === 'Paper Bag' ||
            itm?.package_details === '1 BOX') &&
          spl.startsWith('T')
        ) {
          if (itm?.bag_type === 'Paper Bag') {
            return 'P' + spl.slice(1);
          }

          return spl.slice(1);
        }

        if (itm?.bag_type === 'Paper Bag') {
          return 'P' + spl;
        }

        return spl;
      });

      splitInternalCode = splitInternalCode?.join(' & ');

      const customerTCAndICode = splitInternalCode || '';

      csvPayload.push({
        ['1']: '307',

        ['2']:
          moment(new Date(itm?.delivery_date)).format('YYYY-MM-DD') || '',

        ['3']: itm?.after_time || '',

        ['4']: itm?.before_time || '',

        ['5']: 'STANDARD',

        ['6']: deliveryOwn === 'Delivery' ? 'DELIVERY' : 'COLLECTION',

        ['7']:
          deliveryOwn !== 'Delivery'
            ? 'LAST MEAL BAG COLLECTION ONLY'
            : itm?.package_details || '',

        ['8']:
          deliveryOwn !== 'Delivery'
            ? 'LAST MEAL BAG COLLECTION ONLY'
            : itm?.delivery_notes &&
              itm?.delivery_notes !== 'undefined' &&
              itm?.delivery_notes !== null &&
              itm?.delivery_notes !== ''
              ? itm.delivery_notes
              : 'PICK UP BAGS LEFT OUTSIDE',

        ['9']: '',

        ['10']:
          phase === 'NDD'
            ? `${customerOrderNo} / ${customerTCAndICode} - NDD`
            : `${customerOrderNo} / ${customerTCAndICode}`,

        ['11']: itm?.awb || '',

        ['12']: itm?.awb || '',

        ['13']: '1',

        ['14']: itm?.volume || '',

        ['15']: itm?.weight || '',

        ['16']: 'TRUE',

        ['17']: itm?.customer_name || '',

        ['18']: itm?.customer_mobile?.startsWith('+')
          ? itm.customer_mobile.substring(1)
          : itm?.customer_mobile || '',

        ['19']: itm?.address || '',

        ['20']: itm?.area || '',

        ['21']: itm?.city || '',

        ['22']: 'AE',

        ['23']: '',

        ['24']: '',

        ['25']: '',

        ['26']: '',

        ['27']: '',

        ['28']: '',

        ['29']: '',

        ['30']: '',

        ['31']: '',

        ['32']: '',

        ['33']: '',

        ['34']: '',

        ['35']: itm?.type_of_order || itm?.['35'] || '',

        ['36']: itm?.delivery_status || itm?.['36'] || '',
      });
    });
  });

  const matchedGroups = groups.filter(
    (group) =>
      group?.length > 1 ||
      (group?.length === 1 &&
        group?.[0]?.order_number?.split('&')?.length > 1),
  );

  const unmatchedGroups = groups.filter(
    (group) =>
      group?.length === 1 &&
      (!group?.[0]?.order_number ||
        group?.[0]?.order_number?.split('&')?.length === 1),
  );

  return {
    groups: [...matchedGroups, ...unmatchedGroups],
    matchedGroups,
    unmatchedGroups,
    csvPayload,
  };
}
import React from 'react';

import store from '../store';

import manifest from '../utils/manifest';
import director from '../data/maps';
import runtime from '../data/maps/runtime';
import { withinString } from './i18n';
import { checklists, checkup } from './checklists';
import { Maps } from '../svg';

export function resolveDestination(value) {
  const destinationById = value && destinations.find((d) => d.id === value);
  const destinationByHash = value && destinations.find((d) => d.destinationHash === +value);

  if (destinationById) {
    return destinationById;
  } else if (destinationByHash) {
    return destinationByHash;
  } else {
    const state = store.getState();
    const milestones = state.member.data?.milestones;

    const definitionMilestoneFlashpoint = manifest.DestinyMilestoneDefinition[463010297];

    const milestoneFlashpointQuestItem = definitionMilestoneFlashpoint?.quests[milestones?.[463010297]?.availableQuests?.[0]?.questItemHash];
    const destinationHash = milestoneFlashpointQuestItem?.destinationHash;

    if (destinationHash) return destinations.find((d) => d.destinationHash === destinationHash);

    return destinations.find((d) => d.default);
  }
}

const iconsMap = {
  portal: <Maps.Portal />,
  'ascendant-challenge': <Maps.AscendantChallenge />,
};

function findGraph(search) {
  const place = Object.values(director).find((place) => place.map.bubbles?.find((bubble) => bubble.nodes.find((node) => node[search.key] === +search.value)));
  const bubble = place?.map.bubbles?.find((bubble) => bubble.nodes.find((node) => node[search.key] === +search.value));
  const node = bubble?.nodes.find((node) => node[search.key] === +search.value);

  if (place) {
    return {
      destinationHash: place.destination.hash,
      bubbleHash: bubble.hash,
      nodeHash: node.nodeHash,
      map: {
        points: [
          {
            x: node.x,
            y: node.y,
          },
        ],
      },
    };
  }

  return {};
}

function findChecklistItems(search) {
  const lookup = checkup(search);
  const checklist = lookup?.checklistId && checklists[lookup.checklistId]({ requested: { key: search.key, array: [search.value] } });

  if (checklist?.items.length) {
    return {
      checklist,
      checklistItem:
        checklist?.items?.length < 2
          ? checklist.items.map(({ displayProperties, ...rest }) => ({
              ...rest,
            }))[0]
          : {},
    };
  }

  return {
    checklist: undefined,
    checklistItem: {},
  };
}

export function cartographer(search) {
  const state = store.getState();

  const definitionMaps = manifest.BraytechMapsDefinition[search.value] || Object.values(manifest.BraytechMapsDefinition).find((definition) => definition[search.key] === +search.value);
  const graph = findGraph(search);
  const { checklist, checklistItem } = findChecklistItems(search);
  const dynamic = runtime(state.member, true).find((node) => node[search.key] === +search.value && node.availability?.now);

  if (!definitionMaps && !graph && !checklist?.items.length && !dynamic) {
    return false;
  }

  const icon = dynamic?.icon || (typeof definitionMaps?.icon === 'string' && iconsMap[definitionMaps.icon]);

  // console.log(`definitionMaps`, definitionMaps);
  // console.log(`graph`, graph);
  // console.log(`checklist`, checklist);
  // console.log(`dynamic`, dynamic);

  const aggregate = {
    ...graph,
    ...(definitionMaps || {}),
    checklist,
    ...checklistItem,
    ...(dynamic || {}),
    extended: {
      ...(checklistItem?.extended || {}),
      ...(definitionMaps?.extended || {}),
    },
    icon,
  };

  return aggregate;
}

export function getMapCenter(id) {
  if (!director[id]) return [0, 0];

  const map = director[id].map;

  const centerYOffset = -(map.center && map.center.y) || 0;
  const centerXOffset = (map.center && map.center.x) || 0;

  const center = [map.height / 2 + centerYOffset, map.width / 2 + centerXOffset];

  return center;
}

export const destinations = [
  {
    id: 'fields-of-glass',
    destinationHash: 1993421442,
  },
  {
    id: 'edz',
    destinationHash: 1199524104,
    default: true,
  },
  {
    id: 'tower',
    destinationHash: 333456177,
  },
  {
    id: 'the-farm',
    destinationHash: 4188263703,
  },
  {
    id: 'the-moon',
    destinationHash: 290444260,
  },
  {
    id: 'hellas-basin',
    destinationHash: 308080871,
  },
  {
    id: 'echo-mesa',
    destinationHash: 2218917881,
  },
  {
    id: 'new-pacific-arcology',
    destinationHash: 2388758973,
  },
  {
    id: 'arcadian-valley',
    destinationHash: 126924919,
  },
  {
    id: 'tangled-shore',
    destinationHash: 359854275,
  },
  {
    id: 'dreaming-city',
    destinationHash: 2779202173,
  },
];

export function findNodeType({ checklistHash, recordHash, nodeHash, activityHash }) {
  if (checklistHash) {
    return {
      key: 'checklistHash',
      value: checklistHash,
    };
  } else if (recordHash) {
    return {
      key: 'recordHash',
      value: recordHash,
    };
  } else if (nodeHash) {
    return {
      key: 'nodeHash',
      value: nodeHash,
    };
  } else if (activityHash) {
    return {
      key: 'activityHash',
      value: activityHash,
    };
  }
}

export function locationStrings({ activityHash, destinationHash, bubbleHash, map, extended }) {
  const definitionActivity = manifest.DestinyActivityDefinition[activityHash];
  const definitionDestination = manifest.DestinyDestinationDefinition[destinationHash];
  const definitionPlace = manifest.DestinyPlaceDefinition[definitionDestination?.placeHash];
  const definitionBubble = definitionDestination?.bubbles?.find((bubble) => bubble.hash === (extended?.bubbleHash || bubbleHash));
  const definitionAir = map?.bubbleHash && definitionDestination?.bubbles?.find((bubble) => bubble.hash === map.bubbleHash);

  const destinationName = definitionDestination?.displayProperties?.name;
  const placeName = definitionPlace?.displayProperties?.name && definitionPlace.displayProperties.name !== destinationName && definitionPlace.displayProperties.name;
  const bubbleName = definitionBubble?.displayProperties?.name;
  const airName = definitionAir?.displayProperties?.name;
  const activityName = definitionActivity?.originalDisplayProperties?.name || definitionActivity?.displayProperties.name;

  const destinationString = [bubbleName, activityName, !(airName || activityName) && destinationName, placeName]
    // remove falsey values
    .filter((string) => string)
    // remove duplicate values
    .filter((a, b, self) => self.indexOf(a) === b)
    .join(', ');

  const within = map?.in;
  const withinName = within === 'ascendant-challenge' ? airName || bubbleName : (within && (definitionActivity?.originalDisplayProperties?.name || definitionActivity?.displayProperties.name)) || airName || bubbleName;

  return {
    destinationString,
    withinString: within && withinString(within, withinName),
  };
}

export function screenshotFilename(node) {
  const checklistItem = node.checklist?.items?.[0];

  const definitionDestination = manifest.DestinyDestinationDefinition[checklistItem?.destinationHash];
  const definitionBubble = definitionDestination?.bubbles?.find((bubble) => bubble.hash === (checklistItem?.map?.bubbleHash || checklistItem?.extended?.bubbleHash || checklistItem?.bubbleHash));

  if (node.checklist?.checklistId === 2360931290 && checklistItem?.displayProperties.number) {
    return `${definitionBubble?.displayProperties.name.toLowerCase().replace(/'/g, '').replace(/ /g, '-')}_ghost-scans_${checklistItem.displayProperties.number}.png`;
  } else if (node.checklist?.checklistId === 1697465175 && checklistItem?.displayProperties.number) {
    return `${definitionBubble?.displayProperties.name.toLowerCase().replace(/'/g, '').replace(/ /g, '-')}_region-chests_${checklistItem.displayProperties.number}.png`;
  } else if (node.checklist?.checklistId === 3142056444 && checklistItem?.displayProperties.name) {
    return `${definitionBubble?.displayProperties.name.toLowerCase().replace(/'/g, '').replace(/ /g, '-')}_lost-sectors_${checklistItem.displayProperties.name.toLowerCase().replace(/'/g, '').replace(/ /g, '-')}.png`;
  } else if (node.checklist?.checklistId === 365218222 && checklistItem?.displayProperties.name) {
    return `sleeper-nodes_${checklistItem.displayProperties.name.toLowerCase().replace(' ', '')}.png`;
  } else if (node.checklist?.checklistId === 1420597821 && checklistItem.recordHash) {
    return `${definitionBubble?.displayProperties.name.toLowerCase().replace(/'/g, '').replace(/ /g, '-')}_ghost-stories_${checklistItem.recordHash}.png`;
  } else if (node.checklist?.checklistId === 655926402 && checklistItem.recordHash) {
    return `${definitionBubble?.displayProperties.name.toLowerCase().replace(/'/g, '').replace(/ /g, '-')}_the-forsaken-prince_${checklistItem.recordHash}.png`;
  } else if (node.checklist?.checklistId === 3305936921 && checklistItem.recordHash) {
    return `${definitionBubble?.displayProperties.name.toLowerCase().replace(/'/g, '').replace(/ /g, '-')}_the-awoken-of-the-reef_${checklistItem.recordHash}.png`;
  } else if (node.checklist?.checklistId === 4285512244 && checklistItem.recordHash) {
    return `${definitionBubble?.displayProperties.name.toLowerCase().replace(/'/g, '').replace(/ /g, '-')}_lunas-lost_${checklistItem.recordHash}.png`;
  } else if (node.checklist?.checklistId === 2474271317 && checklistItem.recordHash) {
    return `${definitionBubble?.displayProperties.name.toLowerCase().replace(/'/g, '').replace(/ /g, '-')}_necrotic-cyphers_${checklistItem.recordHash}.png`;
  } else if (node.checklist?.checklistId === 1912364094 && checklistItem.checklistHash) {
    return `jade-rabbits_${checklistItem.checklistHash}.png`;
  } else if (node.checklist?.checklistId === 1297424116 && checklistItem.checklistHash) {
    return `ahamkara-bones_${checklistItem.checklistHash}.png`;
  } else if (node.checklist?.checklistId === 2609997025 && checklistItem?.displayProperties.number) {
    return `${definitionBubble?.displayProperties.name.toLowerCase().replace(/'/g, '').replace(/ /g, '-')}_corrupted-eggs_${checklistItem.displayProperties.number}_${checklistItem.checklistHash}.png`;
  } else if (node.checklist?.checklistId === 2726513366 && checklistItem?.displayProperties.number) {
    return `${definitionBubble?.displayProperties.name.toLowerCase().replace(/'/g, '').replace(/ /g, '-')}_feline-friends_${checklistItem.displayProperties.number}_${checklistItem.checklistHash}.png`;
  }

  return undefined;
}

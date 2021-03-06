import React from 'react';
import { connect } from 'react-redux';
import cx from 'classnames';

import { t, duration, timestampToDifference } from '../../../utils/i18n';
import manifest from '../../../utils/manifest';
import * as converters from '../../../utils/destinyConverters';
import * as enums from '../../../utils/destinyEnums';
import { isContentVaulted } from '../../../utils/destinyUtils';
import itemComponents from '../../../utils/destinyItems/itemComponents';
import sockets from '../../../utils/destinyItems/sockets';
import stats from '../../../utils/destinyItems/stats';
import masterwork from '../../../utils/destinyItems/masterwork';
import { getOrnamentSocket } from '../../../utils/destinyItems/utils';
import ObservedImage from '../../ObservedImage';
import Spinner from '../../UI/Spinner';
import { Common } from '../../../svg';

import './styles.css';

import Default from './Default';
import Equipment from './Equipment';
import Emblem from './Emblem';
import Mod from './Mod';
import SubClass from './SubClass';
import TrialsPassage from './TrialsPassage';

const woolworths = {
  equipment: Equipment,
  emblem: Emblem,
  mod: Mod,
  'sub-class': SubClass,
  'trials-passage': TrialsPassage,
};

const hideScreenshotBuckets = [
  3284755031, // subclass
  1506418338, // artifact
];

const forcedScreenshotTraits = ['ornament'];

function Item(props) {
  const definitionItem = manifest.DestinyInventoryItemDefinition[props.hash];

  const item = {
    itemHash: +props.hash,
    itemInstanceId: props.instanceid,
    itemComponents: null,
    itemState: +props.state || 0,
    quantity: +props.quantity || 1,
    vendorHash: props.vendorhash,
    vendorItemIndex: props.vendoritemindex,
    rarity: converters.itemRarityToString(definitionItem?.inventory?.tierType),
    type: null,
    style: props.style,
  };

  if (item.itemHash !== 343 && !definitionItem) {
    return null;
  }

  if (item.itemHash === 343 || definitionItem.redacted) {
    return (
      <>
        <div className='acrylic' />
        <div className={cx('frame', 'common')}>
          <div className='header'>
            <div className='name'>{t('Classified')}</div>
            <div>
              <div className='kind'>{t('Insufficient clearance')}</div>
            </div>
          </div>
          <div className='black'>
            <div className='description'>
              <pre>{t('Keep it clean.')}</pre>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (definitionItem?.inventory) {
    if (definitionItem.itemType === enums.DestinyItemType.Armor || definitionItem.itemType === enums.DestinyItemType.Weapon || definitionItem.itemType === enums.DestinyItemType.Ship || definitionItem.itemType === enums.DestinyItemType.Vehicle || definitionItem.itemType === enums.DestinyItemType.Ghost || definitionItem.itemType === enums.DestinyItemType.SeasonArtifact) {
      item.type = 'equipment';
    } else if (definitionItem.itemType === enums.DestinyItemType.Emblem) {
      item.type = 'emblem';
    } else if (definitionItem.itemType === enums.DestinyItemType.Mod) {
      item.type = 'mod';
    } else if (definitionItem.itemType === enums.DestinyItemType.Subclass) {
      item.type = 'sub-class';
    } else if (enums.trialsPassages.indexOf(definitionItem.hash) > -1) {
      item.type = 'trials-passage';
    }
  }

  // item.itemState = itemState(item, props.member);
  item.itemComponents = itemComponents(item, props.member);
  item.sockets = sockets(item);
  item.stats = stats(item);
  item.masterwork = masterwork(item);
  item.screenshot = definitionItem.screenshot && definitionItem.screenshot !== '' && definitionItem.screenshot;

  item.primaryStat = (definitionItem.itemType === 2 || definitionItem.itemType === 3) &&
    definitionItem.stats &&
    !definitionItem.stats.disablePrimaryStatDisplay &&
    definitionItem.stats.primaryBaseStatHash && {
      hash: definitionItem.stats.primaryBaseStatHash,
      displayProperties: manifest.DestinyStatDefinition[definitionItem.stats.primaryBaseStatHash].displayProperties,
      value: 750,
    };

  if (item.primaryStat && item.itemComponents && item.itemComponents.instance?.primaryStat) {
    item.primaryStat.value = item.itemComponents.instance.primaryStat.value;
  } else if (item.primaryStat && props.member?.data) {
    const character = props.member.data.profile.characters.data.find((character) => character.characterId === props.member.characterId);

    // item.primaryStat.value = Math.floor((942 / 973) * character.light);
    item.primaryStat.value = character.light;
  }

  const importantText = [];

  const isVaultedItem = isContentVaulted(definitionItem.collectibleHash);
  if (definitionItem.collectibleHash && isVaultedItem) {
    importantText.push(
      t('This collectible will be archived in {{duration}}', {
        duration: duration(timestampToDifference(`${isVaultedItem.releaseDate}T${isVaultedItem.resetTime}`, 'days'), { unit: 'days' }),
      })
    );
  }

  if (!item.itemComponents && props.uninstanced) {
    importantText.push(t('Collections roll'));
  }

  const Meat = item.type && woolworths[item.type];

  if (item.sockets) {
    const ornamentSocket = getOrnamentSocket(item.sockets);

    if (ornamentSocket?.plug?.definition?.screenshot) {
      item.screenshot = ornamentSocket.plug.definition.screenshot;
    }
  }

  const masterworked = enums.enumerateItemState(item.itemState).Masterworked || (!item.itemInstanceId && (definitionItem.itemType === enums.DestinyItemType.Armor ? item.masterwork?.stats?.filter((stat) => stat.value > 9).length : item.masterwork?.stats?.filter((stat) => stat.value >= 9).length));
  const locked = enums.enumerateItemState(item.itemState).Locked;

  const showScreenshot =
    // if viewport is less than 601, item has a screenshot, and hideScreenshotBuckets does not mind this item
    (props.viewport.width <= 600 && item.screenshot && !(definitionItem && definitionItem.inventory && hideScreenshotBuckets.includes(definitionItem.inventory.bucketTypeHash))) ||
    (item.screenshot &&
      // if item is one of these fellas, force show screenshot always
      (definitionItem.traitIds?.filter((id) => forcedScreenshotTraits.filter((trait) => id.includes(trait)).length).length || definitionItem.plug?.plugCategoryIdentifier?.includes('armor_skins')));

  return (
    <>
      <div className='wrapper'>
        <div className='acrylic' />
        <div className={cx('frame', 'item', item.style, item.type, item.rarity, { masterworked: masterworked })}>
          <div className='header'>
            {masterworked ? <ObservedImage className='image bg' src={item.rarity === 'exotic' ? `/static/images/extracts/flair/01A3-00001DDC.PNG` : `/static/images/extracts/flair/01A3-00001DDE.PNG`} /> : null}
            <div className='name'>{definitionItem.displayProperties && definitionItem.displayProperties.name}</div>
            <div>
              {definitionItem.itemTypeDisplayName && definitionItem.itemTypeDisplayName !== '' ? <div className='kind'>{definitionItem.itemTypeDisplayName}</div> : null}
              <div>
                {item.rarity && item.style !== 'ui' ? <div className='rarity'>{definitionItem.inventory.tierTypeName}</div> : null}
                {locked && item.style !== 'ui' ? (
                  <div className='item-state'>
                    <div className='locked'>
                      <Common.ItemStateLocked />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          {importantText.length ? (
            <div className='highlight major'>
              {importantText.map((text, t) => (
                <p key={t}>{text}</p>
              ))}
            </div>
          ) : null}
          <div className='black'>
            {showScreenshot ? (
              <div className='screenshot'>
                <ObservedImage className='image' src={`https://www.bungie.net${item.screenshot}`} />
              </div>
            ) : null}
            {woolworths[item.type] ? <Meat {...props.member} {...item} /> : <Default {...props.member} {...item} />}
          </div>
        </div>
      </div>
    </>
  );
}

function mapStateToProps(state) {
  return {
    member: state.member,
    viewport: state.viewport,
    tooltips: state.tooltips,
  };
}

export default connect(mapStateToProps)(Item);

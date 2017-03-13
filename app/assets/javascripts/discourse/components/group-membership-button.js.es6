import { default as computed } from 'ember-addons/ember-computed-decorators';
import { popupAjaxError } from 'discourse/lib/ajax-error';
import Group from 'discourse/models/group';
import KeyValueStore from 'discourse/lib/key-value-store';

const context = 'discourse_group_membership_button_';
const keyValueStore = new KeyValueStore(context);
const key = 'action';

export default Ember.Component.extend({
  init() {
    this._super();

    if (this.currentUser) {
      const object = keyValueStore.getObject(key);

      if (object && object.id === this.get('model.id') &&
          moment(object.expiry) > moment()) {

        this.send(object.action);
      }
    }

    keyValueStore.remove(key);
  },

  @computed("model.public")
  canJoinGroup(publicGroup) {
    return publicGroup;
  },

  @computed('model.allow_membership_requests', 'model.alias_level')
  canRequestMembership(allowMembershipRequests, aliasLevel) {
    return allowMembershipRequests && aliasLevel === 99;
  },

  @computed("model.is_group_user", "model.id", "groupUserIds")
  userIsGroupUser(isGroupUser, groupId, groupUserIds) {
    if (isGroupUser) {
      return isGroupUser;
    } else {
      return !!groupUserIds && groupUserIds.includes(groupId);
    }
  },

  _showLoginModal() {
    this.sendAction('showLogin');
    $.cookie('destination_url', window.location.href);
  },

 _setKeyValueStore(action) {
   keyValueStore.setObject({ key, value: {
     id: this.get('model.id'),
     action,
     expiry: moment().add(1, "day")
   }});
 },

  actions: {
    joinGroup() {
      if (this.currentUser) {
        this.set('updatingMembership', true);
        const model = this.get('model');

        model.addMembers(this.currentUser.get('username')).then(() => {
          model.set('is_group_user', true);
        }).catch(popupAjaxError).finally(() => {
          this.set('updatingMembership', false);
        });
      } else {
        this._showLoginModal();
        this._setKeyValueStore("joinGroup");
      }
    },

    leaveGroup() {
      this.set('updatingMembership', true);
      const model = this.get('model');

      model.removeMember(this.currentUser).then(() => {
        model.set('is_group_user', false);
      }).catch(popupAjaxError).finally(() => {
        this.set('updatingMembership', false);
      });
    },

    requestMembership() {
      if (this.currentUser) {
        const groupName = this.get('model.name');

        Group.loadOwners(groupName).then(result => {
          const names = result.map(owner => owner.username).join(",");
          const title = I18n.t('groups.request_membership_pm.title');
          const body = I18n.t('groups.request_membership_pm.body', { groupName });
          this.sendAction("createNewMessageViaParams", names, title, body);
        });
      } else {
        this._showLoginModal();
        this._setKeyValueStore("requestMembership");
      }
    }
  }
});

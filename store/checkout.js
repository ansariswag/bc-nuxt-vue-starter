/* eslint-disable camelcase */
import axios from 'axios';
import { getCartId, getOrderId, setOrderId } from '~/utils/storage';

const getLineItems = (item) => {
  if (item) {
    const { custom_items, digital_items, physical_items } = item;
    const items = [...custom_items, ...digital_items, ...physical_items];
    return items.map(({ id, quantity }) => ({ item_id: id, quantity }));
  }
  return [];
};

const getShippingMethod = (consignments) => {
  let method = null;
  if (consignments.length) {
    method = consignments[0].selected_shipping_option ?? null;
  }
  return method;
};

export const state = () => ({
  // new
  personalDetails: null,
  shippingAddress: null,
  shippingMethod: null,
  consignmentId: null,
  billingAddress: null,
  paymentOptions: [],
  // old
  line_items: [],
  old_consignments: [],
  old_billing_address: {}
});

export const getters = {
  // set new checkout data
  personalDetails(state) {
    return state.personalDetails;
  },
  shippingAddress(state) {
    return state.shippingAddress;
  },
  shippingMethod(state) {
    return state.shippingMethod;
  },
  consignmentId(state) {
    return state.consignmentId;
  },
  billingAddress(state) {
    return state.billingAddress;
  },
  paymentOptions(state) {
    return state.paymentOptions;
  },
  // For getting old data from checkout
  line_items(state) {
    return state.line_items;
  },
  old_consignments(state) {
    return state.old_consignments;
  },
  old_billing_address(state) {
    return state.old_billing_address;
  }
};

export const mutations = {
  // new
  SET_PERSONAL_DETAILS(state, personalDetails) {
    state.personalDetails = personalDetails;
  },
  SET_SHIPPING_ADDRESS(state, shippingAddress) {
    state.shippingAddress = shippingAddress;
  },
  SET_SHIPPING_METHOD(state, shippingMethod) {
    state.shippingMethod = shippingMethod;
  },
  SET_CONSIGNMENTID(state, consignmentId) {
    state.consignmentId = consignmentId;
  },
  SET_BILLING_ADDRESS(state, billingAddress) {
    state.billingAddress = billingAddress;
  },
  SET_PAYMENT_OPTIONS(state, paymentOptions) {
    state.paymentOptions = paymentOptions;
  },
  // old
  SET_LINE_ITEMS(state, line_items) {
    state.line_items = line_items;
  },
  SET_OLD_CONSIGNMENTS(state, old_consignments) {
    state.old_consignments = old_consignments;
  },
  SET_OLD_BILLING_ADDRESS(state, old_billing_address) {
    state.old_billing_address = old_billing_address;
  }
};

export const actions = {
  getCheckout({ commit }) {
    const checkoutId = getCartId();
    if (checkoutId) {
      axios.get(`/getCheckout?checkoutId=${checkoutId}`).then(({ data }) => {
        if (data.status) {
          const body = data.body;
          commit('SET_LINE_ITEMS', getLineItems(body?.data?.cart?.line_items));
          commit('SET_OLD_CONSIGNMENTS', body?.data?.consignments);
          commit(
            'SET_SHIPPING_METHOD',
            getShippingMethod(body?.data?.consignments)
          );
          commit('SET_OLD_BILLING_ADDRESS', body?.data?.billing_address);
        } else {
          this.$toast.error(data.message);
        }
      });
    }
  },

  setConsignmentToCheckout(
    { commit, getters, dispatch },
    { shipping_address }
  ) {
    const data = [
      {
        shipping_address,
        line_items: getters.line_items
      }
    ];
    const checkoutId = getCartId();
    axios
      .post(`setConsignmentToCheckout?checkoutId=${checkoutId}`, { data })
      .then(({ data }) => {
        if (data.status) {
          this.$toast.success(data.message);
          const body = data.body;
          const consignment = body?.data?.consignments[0];
          commit('SET_CONSIGNMENTID', consignment.id);
          dispatch('getCheckout');
        } else {
          this.$toast.error(data.message);
        }
      });
  },

  updateConsignmentToCheckout(
    { commit, dispatch, getters },
    { shipping_address, consignmentId }
  ) {
    const data = {
      shipping_address,
      line_items: getters.line_items
    };
    const checkoutId = getCartId();
    axios
      .put(
        `updateConsignmentToCheckout?checkoutId=${checkoutId}&consignmentId=${consignmentId}`,
        { data }
      )
      .then(async ({ data }) => {
        if (data.status) {
          this.$toast.success(data.message);
          if (getters.shippingMethod?.id) {
            await dispatch('updateShippingOption', {
              shippingOptionId: getters.shippingMethod.id,
              consignmentId
            });
          }
          commit('SET_CONSIGNMENTID', consignmentId);
        } else {
          this.$toast.error(data.message);
        }
      });
  },

  setBillingAddress(
    { dispatch, getters },
    { billingAddress, shippingOptionId }
  ) {
    const checkoutId = getCartId();
    const orderId = getOrderId();
    const consignmentId = getters.consignmentId;

    axios
      .post(`setBillingAddressToCheckout?checkoutId=${checkoutId}`, {
        data: billingAddress
      })
      .then(async ({ data }) => {
        if (data.status) {
          this.$toast.success(data.message);
          await dispatch('updateShippingOption', {
            shippingOptionId,
            consignmentId
          });
          if (orderId) dispatch('getPaymentMethodByOrder', orderId);
          else dispatch('createOrder');
        } else {
          this.$toast.error(data.message);
        }
      });
  },

  async updateShippingOption(
    { dispatch },
    { shippingOptionId, consignmentId }
  ) {
    const checkoutId = getCartId();
    const { data } = await axios.put(
      `updateShippingOption?checkoutId=${checkoutId}&consignmentId=${consignmentId}&shippingOptionId=${shippingOptionId}`
    );
    if (data.status) {
      dispatch('getCheckout');
    } else {
      this.$toast.error(data.message);
    }
  },

  createOrder({ dispatch }) {
    const checkoutId = getCartId();
    axios.post(`createOrder?checkoutId=${checkoutId}`).then(({ data }) => {
      if (data.status) {
        this.$toast.success(data.message);
        const orderId = data.body.data.id;
        setOrderId(orderId);
        dispatch('getPaymentMethodByOrder', orderId);
      } else {
        this.$toast.error(data.message);
      }
    });
  },

  getPaymentMethodByOrder({ commit, dispatch }, orderId) {
    axios.get(`getPaymentMethodByOrder?orderId=${orderId}`).then(({ data }) => {
      if (data.status) {
        commit('SET_PAYMENT_OPTIONS', data.body?.data);
      } else {
        this.$toast.error(data.message);
      }
    });
  },
  processPayment({ dispatch }, data) {
    const orderId = getOrderId();
    axios
      .post(`processPayment?orderId=${orderId}`, { data })
      .then(({ data }) => {
        if (data.status) {
          this.$toast.success(data.message);
          dispatch('getCheckout');
        } else {
          this.$toast.error(data.message);
        }
      });
  },
  addCoupons({ dispatch }, couponCode) {
    const checkoutId = getCartId();
    if (!couponCode)
      this.$toast.error('At least, you should input your coupon code');
    else {
      axios.post(`addCoupons`, { checkoutId, couponCode }).then(({ data }) => {
        if (data.status) {
          this.$toast.success(data.message);
          dispatch('getCheckout');
        } else {
          this.$toast.error(data.message);
        }
      });
    }
  }
};

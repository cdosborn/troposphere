/**
 *
 * Validates and sends an imaging request for the selected instance.
 *
 */
Atmo.Views.RequestImagingForm = Backbone.View.extend({
	'tagName': 'div',
	'className' : 'imaging_form module',
	template: _.template(Atmo.Templates.request_imaging_form),
    events: {
        'submit .request_imaging_form' : 'send_request',
		'click #licensed_software' : 'certify_image'
    },
	initialize: function() {
        this.tagger = null;
	},
	render: function() {
		this.$el.html(this.template(this.model.toJSON()));
        var self = this;
        this.tagger = new Atmo.Views.Tagger({
            change: function(tags) {
                self.$el.find('.tag_input').val(tags.join(','));
            }
        });
        this.tagger.render().$el.prependTo(this.$el.find('.tagger_container'));

		// Populate cloud for deployment only with user's available providers

		// Populate the top menu with a provider switcher
		for (var i = 0; i < Atmo.identities.length; i++) {

			var identity = Atmo.identities.models[i];
			var name = Atmo.identities.models[i].get('provider').get('location');
            // Skip eucalyptus
            if (name.match(/eucalyptus/i))
                continue;
			if (identity.get('selected'))
				this.$el.find('select[name="provider"]').prepend('<option value="' + identity.get('provider_id') + '">' + name + '</option>');
			else
				this.$el.find('select[name="provider"]').append('<option value="' + identity.get('provider_id') + '">' + name + '</option>');
		}

		return this;
	},
	certify_image: function(e) {

		if (this.$el.find('#licensed_software:checked').length == 1) {
			this.$el.find('#licensed_software').closest('.control-group').removeClass('error');
			this.$el.find('#licensed_software').closest('.controls').removeClass('alert-error').removeClass('alert');
		}
		else {
			this.$el.find('#licensed_software').closest('.control-group').addClass('error');
			this.$el.find('#licensed_software').closest('.controls').addClass('alert-error').addClass('alert');
		}

	},
    send_request: function(e) {
        var self = this;
        e.preventDefault();

	if (this.$el.find('#licensed_software:checked').length == 0) {
		// You shall not pass!
		this.$el.find('#licensed_software').closest('.control-group').addClass('error');
		this.$el.find('#licensed_software').closest('.controls').addClass('alert-error').addClass('alert');
		return false;
	}

        var form = this.$el.find('.request_imaging_form');
        var formData = form.serializeArray();

	var result = {};
        for(var i = 0; i < formData.length; i++){
		var data = formData[i];
		result[data.name] = data.value;
        }

        $.ajax({
            type: 'POST',
            url: Atmo.API_ROOT + '/provider/'+Atmo.profile.get('selected_identity').get('provider_id') + '/identity/' + Atmo.profile.get('selected_identity').id + '/request_image',
            data: JSON.stringify(result),
            dataType: 'json',
            contentType: 'application/json',
            success: function() {
                self.$el.find('.request_image_submit').val("Request Submitted!").attr("disabled", "disabled").click(function() { return false; });
            },
			error: function(request, model, error) {
                Atmo.Utils.notifyErrors(request, 'Could not submit imaging request for the following reason(s):');
			},
            dataType: 'json'
        });

        return false;

    }
});

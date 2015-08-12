define(function (require) {
  'use strict';

  //
  // Dependencies
  //

  var AppDispatcher = require('dispatchers/AppDispatcher'),
    stores = require('stores'),
    NotificationController = require('controllers/NotificationController'),
    Router = require('../Router'),
    Utils = require('./Utils'),
    actions = require('actions');

  // Constants
  var NullProjectInstanceConstants = require('constants/NullProjectInstanceConstants'),
    NullProjectVolumeConstants = require('constants/NullProjectVolumeConstants'),
    ProjectInstanceConstants = require('constants/ProjectInstanceConstants'),
    ProjectVolumeConstants = require('constants/ProjectVolumeConstants'),
    ProjectConstants = require('constants/ProjectConstants');

  // Models
  var Project = require('models/Project'),
    Instance = require('models/Instance'),
    Volume = require('models/Volume');

  // Modals
  var ModalHelpers = require('components/modals/ModalHelpers'),
    NullProjectMoveAttachedVolumesModal = require('components/modals/nullProject/NullProjectMoveAttachedVolumesModal.react'),
    NullProjectMigrateResourceModal = require('components/modals/nullProject/NullProjectMigrateResourceModal.react');

  //
  // Module
  //

  return {

    // ------------------------
    // Standard CRUD Operations
    // ------------------------

    _migrateResourceIntoProject: function (resource, project) {
      actions.ProjectActions.addResourceToProject(resource, project);

      if (resource instanceof Instance) {
        Utils.dispatch(NullProjectInstanceConstants.REMOVE_INSTANCE_FROM_NULL_PROJECT, {
          instance: resource
        });
      } else if (resource instanceof Volume) {
        Utils.dispatch(NullProjectVolumeConstants.REMOVE_VOLUME_FROM_NULL_PROJECT, {
          volume: resource
        });
      }
    },

    _migrateResourceIntoRealProject: function (resource, oldProject, newProject) {
      actions.ProjectActions.addResourceToProject(resource, newProject);

      if (oldProject) {
        if (resource instanceof Instance) {
          Utils.dispatch(ProjectInstanceConstants.REMOVE_PROJECT_INSTANCE, {
            instance: resource,
            project: oldProject
          });
        } else if (resource instanceof Volume) {
          Utils.dispatch(ProjectVolumeConstants.REMOVE_PROJECT_VOLUME, {
            volume: resource,
            project: oldProject
          });
        }
      }
    },

    _migrateResourcesIntoProject: function (resources, project) {
      resources.map(function (resource) {
        this._migrateResourceIntoProject(resource, project);
      }.bind(this));

      Router.getInstance().transitionTo("project-resources", {projectId: project.id});
    },

    // synchronize project resource state
    // 1. If resource not in a project, force user to put it into one
    // 2. If volume is attached
    // Uh oh!  Looks like you have some resources that aren't in a project.
    //
    // This can occur the first time you use
    // the new Atmosphere interface, or by switching back and forth between the old and new UI
    //
    moveAttachedVolumesIntoCorrectProject: function () {
      var projects = stores.ProjectStore.getAll(),
        instances = stores.InstanceStore.getAll(),
        volumes = stores.VolumeStore.getAll(),
        volumesInWrongProject = [];

      // Move volumes into correct project
      volumes.each(function (volume) {
        var volumeProjectId = volume.get('projects')[0],
          volumeProject = stores.ProjectStore.get(volumeProjectId),
          instanceUUID = volume.get('attach_data').instance_id,
          instance,
          instanceProjectId,
          project;

        if (instanceUUID) {
          instance = instances.findWhere({uuid: instanceUUID});

          if (!instance) {
            console.warn("Instance with uuid: " + instanceUUID + " was not found.");
            return;
          }

          instanceProjectId = instance.get('projects')[0];
          if (volumeProjectId !== instanceProjectId) {
            project = stores.ProjectStore.get(instanceProjectId);
            this._migrateResourceIntoRealProject(volume, volumeProject, project);
            volumesInWrongProject.push({
              volume: volume,
              instance: instance,
              oldProject: volumeProject,
              newProject: project
            })
          }
        }
      }.bind(this));

      // Let the user know what we just did
      if (volumesInWrongProject.length > 0) {
        var props = {
          movedVolumesArray: volumesInWrongProject,
          backdrop: 'static'
        };

        ModalHelpers.renderModal(NullProjectMoveAttachedVolumesModal, props, function () {
        });
      }
    },

    migrateResourcesIntoProject: function (nullProject) {
      var instances = nullProject.get('instances'),
        volumes = nullProject.get('volumes'),
        resources = new Backbone.Collection(),
        that = this;

      instances.each(function (instance) {
        resources.push(instance);
      });

      volumes.each(function (volume) {
        resources.push(volume);
      });

      if (resources.length > 0) {

        var props = {
          resources: resources,
          backdrop: 'static'
        };

        ModalHelpers.renderModal(NullProjectMigrateResourceModal, props, function (params) {
          var resourcesClone = resources.models.slice(0);
          var project;

          if (params.projectName) {
            project = new Project({
              name: params.projectName,
              description: params.projectName,
              instances: [],
              volumes: []
            });

            Utils.dispatch(ProjectConstants.ADD_PROJECT, {project: project});

            project.save().done(function () {
              //NotificationController.success(null, "Project " + project.get('name') + " created.");
              Utils.dispatch(ProjectConstants.UPDATE_PROJECT, {project: project});
              that._migrateResourcesIntoProject(resourcesClone, project);
              that.moveAttachedVolumesIntoCorrectProject();
            }).fail(function () {
              var message = "Error creating Project " + project.get('name') + ".";
              NotificationController.error(null, message);
              Utils.dispatch(ProjectConstants.REMOVE_PROJECT, {project: project});
            });

          } else if (params.projectId && params.projects) {
            project = params.projects.get(params.projectId);
            that._migrateResourcesIntoProject(resourcesClone, project);
            that.moveAttachedVolumesIntoCorrectProject();
          } else {
            throw new Error("expected either projectName OR projectId and projects parameters")
          }
        })

      } else {
        that.moveAttachedVolumesIntoCorrectProject();
      }
    }

  };

});

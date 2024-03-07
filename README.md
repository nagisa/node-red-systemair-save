<div align="center">
  <h1><code>@nagisa~/node-red-systemair-save</code></h1>

  <p>
    <strong>Interact with the Systemair SAVE series of devices</strong>
  </p>

</div>

This package provides nodes for the [node-red](https://nodered.org) project to interact with the
[Systemair SAVE air handling units][mfct].

[mfct]: https://www.systemair.com/en/products/residential-ventilation-systems/air-handling-units/save

Currently communication over Modbus TCP over the SystemAIR IAM module or another Modbus gateway is
supported. You may be tempted to rely on the popular `node-red-contrib-modbus` package to
communicate with your air handing unit, but I found it to have trouble doing so reliably due to the
specifics of how SystemAIR devices implement the Modbus protocol. In particular, these units
frequently return a status code indicating that the request should be retried. Most plain Modbus
libraries will treat this code as a failure, where the right thing for SystemAIR devices is to
retry the request a moment later. Nodes provided in this library handle this and similar other
specifics for you.

The `systemair register` node configuration provides a list of registers you can
choose to operate on with a convenient selector. All of the known and documented registers are
available for selection here, saving you the effort in correlating with the register lists.

![A part of systemair register node configuration window to configure the register this node
interacts with. To the top right there is a search field and underneath it a scrollable list of
selectable register. Each register choice presents the register address, it's symbolic name and
a description.](register-picker.png).

For the simplest automations this may be sufficient. As the automations get more complicated, users
may discover some of the functionality or information in the SystemAIR device to be exposed through
an inconveniently large number of distinct registers. This library makes it straightforward to
interact with this data through a concept of "virtual registers". These registers expose a concept,
such as the alarm state, as a single node that apply special logic to a register operation. For the
virtual alarm register in particular this node will read out all of the registers indicating alarm
states and present them as a single key-value record to inspect.

![A part of systemair register node configuration window to configure the register this node
interacts with. The "Type" option is set to "Virtual Register", and the scrollable list of
selectable registers shows a different list of selectable registers than in the image above. The
"ALARMS" virtual register is selected. The description text for this register reads "All alarm
states from registers 14003, 150xx, 151xx and 155xx in a convenient JS
record."](virtual-register.png).

All in all, this package provides quite a convenient way to integrate your SystemAIR air handling
unit with your home automation needs. For example here's a part of my flow, with all sorts of
interesting data being saved to InfluxDB for later viewing and graphing. This flow also implements
some automations such as requesting a refresh mode after a shower is taken, or a cooker hood mode
when the cooker hood is turned on.

![For example here's a part of my flow, with all sorts of interesting data being saved to InfluxDB
for later viewing and graphing. This flow also implements some automations such as requesting a
refresh mode after a shower is taken, or a cooker hood mode when the cooker hood is turned
on.](example.webp)

## Contribution guidelines

I consider this project largely complete for my own needs. I anticipate it to be updated
occasionally in case of an incompatibility with new versions of node-red or node; or if I end
up discovering new requirements. For anything else, please implement the desired changes yourself
and submit a PR. Thank you!

## Disclaimers

This is a third-party project. Systemair, SAVE, the Systemair logo and various other similar
identifiers or assets that are referenced in this project are (most likely) trademarks and
otherwise registered marks of Systemair AB or a related legal entity. Use of these names is only
meant to refer to the vendor’s products and in no way implies an endorsement or any other
relationship between the vendor and this project.
